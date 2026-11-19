import { describe, it, expect, beforeEach, vi } from "vitest";
import type { CrewApplication } from "@/lib/crew/types";

const app = {
  _id: "app1",
  status: "submitted",
  applicant: { fullName: "Aroha Smith", email: "aroha@example.com", offshoreMiles: 2500, nightWatches: "10-50" },
  passages: ["p1"],
  cv: { pathname: "crew-cv/app1/cv.pdf", fileName: "cv.pdf", mime: "application/pdf", size: 10, extractedText: "CV TEXT" },
  assessment: {
    scores: { seamanship: { score: 4 }, offshoreRecord: { score: 4 }, fitAboard: { score: 3 }, skills: { score: 3 }, availability: { score: 5 } },
    weightedScore: 3.8,
    recommendation: "possible",
    redFlags: [],
    inconsistencies: [],
    callQuestions: ["a", "b", "c"],
    summary: "s",
  },
} as unknown as CrewApplication;

const setStatus = vi.fn(async () => undefined);
vi.mock("@/lib/crew/store", () => ({
  getApplication: vi.fn(async (id: string) => (id === "app1" ? structuredClone(app) : null)),
  getApplications: vi.fn(async () => [structuredClone(app)]),
  listApplications: vi.fn(async () => [{ id: "app1", name: "Aroha Smith", status: "submitted", weightedScore: 3.8 }]),
  setStatus: (...a: unknown[]) => setStatus(...(a as [])),
  addOwnerNote: vi.fn(async () => undefined),
  listExpired: vi.fn(async () => []),
  deleteApplication: vi.fn(async () => undefined),
}));
vi.mock("@/lib/crew/passages", () => ({
  passagesById: vi.fn(async () => [{ _id: "p1", title: "Auckland to Tonga", status: "open", type: "offshore", crewPlaces: 3 }]),
}));
vi.mock("@/lib/crew/blob", () => ({
  signedDownloadUrl: vi.fn(async () => "https://blob.example/signed"),
  deleteBlob: vi.fn(async () => undefined),
}));

const TOKEN = "a".repeat(48);

async function rpc(method: string, params: unknown, token: string | null = TOKEN) {
  const { POST } = await import("@/app/api/mcp/route");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await POST(new Request("http://localhost/api/mcp", { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }));
  return { res, body: res.status === 200 ? await res.json() : null };
}

const toolText = (body: { result: { content: { text: string }[] } }) => body.result.content[0].text;

beforeEach(() => {
  process.env.CREW_ADMIN_TOKEN = TOKEN;
  setStatus.mockClear();
});

describe("/api/mcp", () => {
  it("returns 401 without the admin bearer token", async () => {
    expect((await rpc("tools/list", {}, null)).res.status).toBe(401);
    expect((await rpc("tools/list", {}, "wrong-token")).res.status).toBe(401);
  });

  it("returns 401 when no admin token is configured", async () => {
    delete process.env.CREW_ADMIN_TOKEN;
    expect((await rpc("tools/list", {}, TOKEN)).res.status).toBe(401);
  });

  it("lists the crew tools", async () => {
    const { body } = await rpc("tools/list", {});
    const names = body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      "add_note",
      "compare_applicants",
      "draft_reply",
      "get_application",
      "get_cv_text",
      "list_applications",
      "passage_roster",
      "set_status",
    ]);
  });

  it("get_application omits CV text unless asked", async () => {
    const without = await rpc("tools/call", { name: "get_application", arguments: { id: "app1" } });
    expect(toolText(without.body)).not.toContain("CV TEXT");
    const withCv = await rpc("tools/call", { name: "get_application", arguments: { id: "app1", includeCvText: true } });
    expect(toolText(withCv.body)).toContain("CV TEXT");
  });

  it("get_cv_text returns the text and a signed link", async () => {
    const { body } = await rpc("tools/call", { name: "get_cv_text", arguments: { id: "app1" } });
    const out = JSON.parse(toolText(body));
    expect(out.text).toBe("CV TEXT");
    expect(out.downloadUrl).toBe("https://blob.example/signed");
  });

  it("set_status writes through the store (with audit)", async () => {
    await rpc("tools/call", { name: "set_status", arguments: { id: "app1", status: "shortlisted", note: "good call" } });
    expect(setStatus).toHaveBeenCalledWith("app1", "shortlisted", "good call");
  });

  it("draft_reply returns a draft and never sends", async () => {
    const { body } = await rpc("tools/call", { name: "draft_reply", arguments: { id: "app1", intent: "invite_call" } });
    const out = JSON.parse(toolText(body));
    expect(out.sent).toBe(false);
    expect(out.body).toContain("Aroha");
    expect(out.body).toContain("Auckland to Tonga");
    expect(out.body).not.toMatch(/score|3\.8|possible/i);
  });

  it("passage_roster reports places left", async () => {
    const { body } = await rpc("tools/call", { name: "passage_roster", arguments: { passageId: "p1" } });
    expect(JSON.parse(toolText(body)).placesLeft).toBe(2); // 3 places, list mock returns 1 accepted
  });

  it("compare_applicants needs 2–5 ids", async () => {
    const { body } = await rpc("tools/call", { name: "compare_applicants", arguments: { ids: ["app1"] } });
    expect(body.result?.isError ?? body.error).toBeTruthy();
  });
});

describe("/api/cron/crew-purge", () => {
  it("requires CRON_SECRET", async () => {
    process.env.CRON_SECRET = "c".repeat(40);
    const { GET } = await import("@/app/api/cron/crew-purge/route");
    expect((await GET(new Request("http://x/api/cron/crew-purge"))).status).toBe(401);
    const ok = await GET(new Request("http://x/api/cron/crew-purge", { headers: { authorization: `Bearer ${"c".repeat(40)}` } }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ deleted: 0, failed: 0 });
  });

  it("deletes expired applications and their CVs", async () => {
    process.env.CRON_SECRET = "c".repeat(40);
    const store = await import("@/lib/crew/store");
    const blob = await import("@/lib/crew/blob");
    vi.mocked(store.listExpired)
      .mockResolvedValueOnce([{ _id: "old1", cvPathname: "crew-cv/old1/cv.pdf" }, { _id: "old2" }])
      .mockResolvedValueOnce([]);
    const { GET } = await import("@/app/api/cron/crew-purge/route");
    const res = await GET(new Request("http://x", { headers: { authorization: `Bearer ${"c".repeat(40)}` } }));
    expect(await res.json()).toEqual({ deleted: 2, failed: 0 });
    expect(blob.deleteBlob).toHaveBeenCalledWith("crew-cv/old1/cv.pdf");
    expect(store.deleteApplication).toHaveBeenCalledWith("old1");
    expect(store.deleteApplication).toHaveBeenCalledWith("old2");
  });
});

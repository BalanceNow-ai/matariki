import { describe, it, expect, beforeEach, vi } from "vitest";
import { validApplication } from "./fixtures";

const createDraft = vi.fn(async (_input: unknown) => "app-new");
vi.mock("@/lib/crew/store", () => ({ createDraft: (input: unknown) => createDraft(input) }));
vi.mock("@/lib/crew/passages", () => ({
  openPassages: vi.fn(async () => [{ _id: "passage-tonga", title: "Tonga", type: "offshore", status: "open" }]),
}));
const verifyTurnstile = vi.fn(async (_t?: string, _ip?: string) => true);
vi.mock("@/lib/crew/turnstile", () => ({ verifyTurnstile: (t?: string, ip?: string) => verifyTurnstile(t, ip) }));

process.env.CREW_SESSION_SECRET = "z".repeat(40);

let ipN = 0;
async function post(body: unknown, ip = `10.0.0.${++ipN}`) {
  const { POST } = await import("@/app/api/crew/applications/route");
  return POST(
    new Request("http://localhost/api/crew/applications", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  createDraft.mockClear();
  verifyTurnstile.mockClear();
  verifyTurnstile.mockResolvedValue(true);
});

describe("POST /api/crew/applications", () => {
  it("creates a draft and returns a session token for it", async () => {
    const res = await post({ turnstileToken: "ok", application: validApplication() });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.applicationId).toBe("app-new");
    const { verifySession } = await import("@/lib/crew/session");
    expect(verifySession(body.sessionToken)).toBe("app-new");

    const input = createDraft.mock.calls[0][0] as { applicant: Record<string, unknown>; ipHash: string; passages: string[] };
    expect(input.passages).toEqual(["passage-tonga"]);
    expect(input.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(input.ipHash).not.toContain("10.0.0");
    expect(input.applicant).not.toHaveProperty("consentPrivacy");
  });

  it("rejects a failed Turnstile check", async () => {
    verifyTurnstile.mockResolvedValue(false);
    expect((await post({ turnstileToken: "bad", application: validApplication() })).status).toBe(403);
    expect(createDraft).not.toHaveBeenCalled();
  });

  it("rejects invalid forms with field issues", async () => {
    const res = await post({ turnstileToken: "ok", application: validApplication({ email: "nope" }) });
    expect(res.status).toBe(400);
    expect((await res.json()).issues[0].path).toEqual(["application", "email"]);
  });

  it("rejects passages that are not open", async () => {
    const res = await post({ turnstileToken: "ok", application: validApplication({ passages: ["passage-closed"] }) });
    expect(res.status).toBe(400);
  });

  it("allows 3 applications per IP per day", async () => {
    const ip = "192.0.2.77";
    for (let i = 0; i < 3; i++) expect((await post({ turnstileToken: "ok", application: validApplication() }, ip)).status).toBe(201);
    expect((await post({ turnstileToken: "ok", application: validApplication() }, ip)).status).toBe(429);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const listExpired = vi.fn<() => Promise<{ _id: string; cvPathname?: string }[]>>(async () => []);
const deleteApplication = vi.fn<(id: string) => Promise<void>>(async () => {});
vi.mock("@/lib/crew/store", () => ({
  listExpired: () => listExpired(),
  deleteApplication: (id: string) => deleteApplication(id),
}));
vi.mock("@/lib/crew/blob", () => ({ deleteBlob: vi.fn(async () => {}) }));

const SECRET = "c".repeat(40);

async function run() {
  const { GET } = await import("@/app/api/cron/crew-purge/route");
  return GET(new Request("http://localhost/api/cron/crew-purge", { headers: { authorization: `Bearer ${SECRET}` } }));
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.SANITY_CREW_WRITE_TOKEN = "sk-test";
  listExpired.mockReset().mockResolvedValue([]);
  deleteApplication.mockClear();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.SANITY_CREW_WRITE_TOKEN;
  vi.restoreAllMocks();
});

describe("GET /api/cron/crew-purge", () => {
  it("still requires the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/crew-purge/route");
    expect((await GET(new Request("http://localhost/api/cron/crew-purge"))).status).toBe(401);
  });

  it("skips with 200 and one info line when SANITY_CREW_WRITE_TOKEN is unset", async () => {
    delete process.env.SANITY_CREW_WRITE_TOKEN;
    const res = await run();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: "crew dataset not configured" });
    expect(console.info).toHaveBeenCalledOnce();
    expect(listExpired).not.toHaveBeenCalled();
  });

  it("skips with 200 when the crew dataset does not exist", async () => {
    listExpired.mockRejectedValue(Object.assign(new Error("Dataset not found"), { statusCode: 404 }));
    const res = await run();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: "crew dataset not configured" });
    expect(console.info).toHaveBeenCalledOnce();
  });

  it("still throws on other Sanity errors", async () => {
    listExpired.mockRejectedValue(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    await expect(run()).rejects.toThrow("Unauthorized");
  });

  it("purges expired applications when configured", async () => {
    listExpired.mockResolvedValueOnce([{ _id: "a1" }, { _id: "a2" }]).mockResolvedValue([]);
    const res = await run();
    expect(await res.json()).toEqual({ deleted: 2, failed: 0 });
    expect(deleteApplication).toHaveBeenCalledTimes(2);
  });
});

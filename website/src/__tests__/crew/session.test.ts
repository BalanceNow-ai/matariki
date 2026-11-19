import { describe, it, expect } from "vitest";
import { signSession, verifySession, SESSION_TTL_MS, requestHasSessionFor } from "@/lib/crew/session";

const secret = "s".repeat(40);

describe("session tokens", () => {
  it("round-trips the application id", () => {
    const t = signSession("app-1", { secret, now: 1000 });
    expect(verifySession(t, { secret, now: 2000 })).toBe("app-1");
  });

  it("expires after two hours", () => {
    const t = signSession("app-1", { secret, now: 0 });
    expect(verifySession(t, { secret, now: SESSION_TTL_MS - 1 })).toBe("app-1");
    expect(verifySession(t, { secret, now: SESSION_TTL_MS })).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const t = signSession("app-1", { secret: "x".repeat(40), now: 0 });
    expect(verifySession(t, { secret, now: 1 })).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const t = signSession("app-1", { secret, now: 0 });
    const [, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ aid: "app-2", exp: 9e15 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, { secret, now: 1 })).toBeNull();
  });

  it("rejects garbage", () => {
    for (const bad of [null, undefined, "", "abc", "a.b.c", "a".repeat(2000)]) {
      expect(verifySession(bad, { secret })).toBeNull();
    }
  });

  it("refuses to work with a short secret", () => {
    expect(() => signSession("a", { secret: "short" })).toThrow();
  });

  it("only grants the application it was issued for", () => {
    process.env.CREW_SESSION_SECRET = secret;
    const t = signSession("app-1");
    const req = new Request("http://x", { headers: { "x-crew-session": t } });
    expect(requestHasSessionFor(req, "app-1")).toBe(true);
    expect(requestHasSessionFor(req, "app-2")).toBe(false);
  });
});

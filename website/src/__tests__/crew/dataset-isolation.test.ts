/**
 * The public Sanity client must never be able to read crew applications.
 *
 * The structural checks below always run. The live check only runs with
 * CREW_LIVE_DATASET_CHECK=1 (it needs network access to Sanity): it queries
 * the crew dataset anonymously and expects to be refused or to see nothing.
 * Manual equivalent:
 *   curl "https://<projectId>.api.sanity.io/v2024-01-01/data/query/crew?query=*%5B0...1%5D"
 *   → must return 401/403, or {"result": []}
 */
import { describe, it, expect, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { client as publicClient, projectId } from "@/sanity/client";

// The shared test setup swaps fetch for a mock before each test; keep the real one.
const realFetch = globalThis.fetch;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

describe("crew dataset isolation", () => {
  afterEach(() => {
    delete process.env.SANITY_CREW_DATASET;
  });

  it("public client targets production, without a token", () => {
    const cfg = publicClient.config();
    expect(cfg.dataset).not.toBe("crew");
    expect(cfg.token).toBeFalsy();
  });

  it("crew client refuses to point at the public dataset", async () => {
    const mod = await import("@/lib/crew/sanityCrew");
    mod.setCrewClientForTests(null);
    process.env.SANITY_CREW_WRITE_TOKEN = "test-token";
    process.env.SANITY_CREW_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
    expect(() => mod.getCrewClient()).toThrow(/must not be the public dataset/);
    mod.setCrewClientForTests(null);
  });

  it("crew client is server-only, tokened and bypasses the CDN", async () => {
    const src = readFileSync(path.resolve(__dirname, "../../lib/crew/sanityCrew.ts"), "utf8");
    expect(src).toMatch(/^import "server-only";/m);
    const mod = await import("@/lib/crew/sanityCrew");
    mod.setCrewClientForTests(null);
    process.env.SANITY_CREW_WRITE_TOKEN = "test-token";
    process.env.SANITY_CREW_DATASET = "crew";
    const cfg = mod.getCrewClient().config();
    expect(cfg.dataset).toBe("crew");
    expect(cfg.useCdn).toBe(false);
    expect(cfg.token).toBe("test-token");
    mod.setCrewClientForTests(null);
  });

  it("no client component imports the crew store or client", async () => {
    const files = tsxFiles(path.resolve(__dirname, "../.."));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (!/^["']use client["']/m.test(src)) continue;
      expect(src, f).not.toMatch(/lib\/crew\/(store|sanityCrew|blob|email)/);
    }
  });

  it.runIf(process.env.CREW_LIVE_DATASET_CHECK === "1")("anonymous query of the crew dataset returns nothing", async () => {
    const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/crew?query=${encodeURIComponent("*[0...1]")}`;
    const res = await realFetch(url);
    if (res.ok) {
      const body = (await res.json()) as { result: unknown[] };
      expect(body.result).toEqual([]);
    } else {
      expect([401, 403, 404]).toContain(res.status);
    }
  });
});

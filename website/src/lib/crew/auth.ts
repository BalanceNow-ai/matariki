/**
 * Admin authentication for the crew endpoints (CV download, MCP server).
 *
 * A single shared bearer token today. Callers go through `authenticateAdmin`,
 * which returns an identity rather than a boolean, so OAuth can replace the
 * static token later without touching the endpoints.
 */
import { timingSafeEqual } from "node:crypto";

export type AdminIdentity = { subject: string; method: "static-token" };

export function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function bearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

/**
 * Fails closed: if CREW_ADMIN_TOKEN is unset or too short, nobody is admin.
 */
export async function authenticateAdmin(request: Request): Promise<AdminIdentity | null> {
  const expected = process.env.CREW_ADMIN_TOKEN;
  if (!expected || expected.length < 32) return null;
  const token = bearerToken(request);
  if (!token || !constantTimeEquals(token, expected)) return null;
  return { subject: "owner", method: "static-token" };
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": 'Bearer realm="matariki-crew"',
    },
  });
}

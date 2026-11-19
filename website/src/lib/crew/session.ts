/**
 * Applicant session tokens.
 *
 * After the form is accepted the applicant gets a token that lets them, and
 * only them, attach a CV and take the interview for that one application.
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload)).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

type SessionPayload = { aid: string; exp: number };

function secret(explicit?: string): string {
  const s = explicit ?? process.env.CREW_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("CREW_SESSION_SECRET is missing or shorter than 32 characters");
  }
  return s;
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

function sign(body: string, key: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

export function signSession(
  applicationId: string,
  opts: { now?: number; ttlMs?: number; secret?: string } = {}
): string {
  const now = opts.now ?? Date.now();
  const payload: SessionPayload = {
    aid: applicationId,
    exp: now + (opts.ttlMs ?? SESSION_TTL_MS),
  };
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body, secret(opts.secret))}`;
}

/** Returns the application id the token grants access to, or null. */
export function verifySession(
  token: string | null | undefined,
  opts: { now?: number; secret?: string } = {}
): string | null {
  if (!token || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = Buffer.from(sign(body, secret(opts.secret)));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.aid !== "string" || typeof payload.exp !== "number") return null;
    if ((opts.now ?? Date.now()) >= payload.exp) return null;
    return payload.aid;
  } catch {
    return null;
  }
}

/** Read a session token from `Authorization: Bearer` or `x-crew-session`. */
export function sessionFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return request.headers.get("x-crew-session");
}

/** Verify the request's session token grants access to `applicationId`. */
export function requestHasSessionFor(request: Request, applicationId: string): boolean {
  const aid = verifySession(sessionFromRequest(request));
  return aid !== null && aid === applicationId;
}

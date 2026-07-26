/**
 * Shared authentication for the position endpoints.
 *
 * These endpoints previously each rolled their own token check — and several
 * had none at all, while still being able to inject positions or delete stored
 * track data. Centralising the logic means an endpoint either opts into the
 * check or visibly does not.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

export type TokenExtraction = {
  token: string | null;
  /** Which mechanism supplied the token, for diagnostics. Never the token itself. */
  method: string;
};

/**
 * Pull a token from any of the mechanisms the boat's webhook software may use.
 * Header forms are preferred; query parameters are supported because
 * msp-webhook cannot send headers.
 */
export function extractToken(request: NextRequest): TokenExtraction {
  const authHeader = request.headers.get("authorization");
  const xAuthToken = request.headers.get("x-auth-token");
  const xApiKey = request.headers.get("x-api-key");
  const apiKey = request.headers.get("api-key");

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      return { token: authHeader.substring(7), method: "bearer" };
    }
    if (authHeader.startsWith("Basic ")) {
      try {
        const decoded = atob(authHeader.substring(6));
        const password = decoded.split(":")[1];
        return { token: password || null, method: "basic" };
      } catch {
        return { token: null, method: "basic-invalid" };
      }
    }
    return { token: authHeader, method: "authorization-raw" };
  }

  if (xAuthToken) return { token: xAuthToken, method: "x-auth-token" };
  if (xApiKey) return { token: xApiKey, method: "x-api-key" };
  if (apiKey) return { token: apiKey, method: "api-key" };

  const params = request.nextUrl.searchParams;
  for (const [param, method] of [
    ["token", "query-token"],
    ["secret", "query-secret"],
    ["api_key", "query-api_key"],
    ["auth_key", "query-auth_key"],
  ] as const) {
    const value = params.get(param);
    if (value) return { token: value, method };
  }

  return { token: null, method: "none" };
}

/**
 * Constant-time token comparison.
 *
 * `===` on secrets leaks their length and, in principle, a prefix through
 * response timing. The length is compared first because timingSafeEqual
 * requires equal-length buffers; that only reveals the length, which an
 * attacker controls anyway.
 */
export function tokensMatch(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export function isSecretConfigured(): boolean {
  return !!SIGNALK_SECRET;
}

/**
 * Gate an endpoint that can modify or expose stored data.
 *
 * Returns a response to send when the request must be refused, or null when it
 * may proceed. Fails closed: with no configured secret there is no way to
 * authenticate anyone, so the endpoint is unavailable rather than open.
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  if (!SIGNALK_SECRET) {
    return NextResponse.json(
      {
        error: "Endpoint disabled",
        message:
          "SIGNALK_WEBHOOK_SECRET is not configured, so this endpoint cannot " +
          "authenticate callers and refuses all requests.",
      },
      { status: 503 }
    );
  }

  const { token } = extractToken(request);
  if (!tokensMatch(token, SIGNALK_SECRET)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing authentication token" },
      { status: 401 }
    );
  }

  return null;
}

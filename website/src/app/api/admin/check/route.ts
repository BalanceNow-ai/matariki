import { NextRequest, NextResponse } from "next/server";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

// Secret token for admin authentication
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/**
 * POST /api/admin/check
 * Verifies if the provided token matches the admin secret
 * Used by the frontend to check if user has admin access
 */
export async function POST(request: NextRequest) {
  // If no secret is configured, allow all operations (development mode)
  if (!SIGNALK_SECRET) {
    return NextResponse.json({ authorized: true, mode: "no-secret" });
  }

  // Extract token from various sources
  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");

  let body: { token?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body provided
  }

  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (xApiKey) {
    token = xApiKey;
  } else if (body.token) {
    token = body.token;
  }

  if (token === SIGNALK_SECRET) {
    return NextResponse.json({ authorized: true });
  }

  return NextResponse.json({ authorized: false }, { status: 401 });
}

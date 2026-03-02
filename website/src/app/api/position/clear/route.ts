import { NextRequest, NextResponse } from "next/server";
import { clearTrackHistoryAsync } from "../redis-store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

// Secret token to authenticate track management
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/**
 * POST /api/position/clear
 * Clears GPX track history while preserving Signal K data
 * Use this to remove GPS artifacts/jumps from the track
 * Signal K live data (source: "signalk") is preserved
 */
export async function POST(request: NextRequest) {
  // Verify secret token
  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");
  const queryToken = request.nextUrl.searchParams.get("token");

  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (xApiKey) {
    token = xApiKey;
  } else if (queryToken) {
    token = queryToken;
  }

  // Check authentication
  if (SIGNALK_SECRET && token !== SIGNALK_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing authentication token" },
      { status: 401 }
    );
  }

  try {
    const result = await clearTrackHistoryAsync();
    return NextResponse.json({
      success: true,
      message: `Cleared ${result.cleared} track positions`,
      cleared: result.cleared,
    });
  } catch (error) {
    console.error("[Clear Track] Error:", error);
    return NextResponse.json(
      { error: "Failed to clear track history", details: String(error) },
      { status: 500 }
    );
  }
}

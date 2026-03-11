import { NextRequest, NextResponse } from "next/server";
import { clearTrackHistoryAsync, clearAllTrackDataAsync } from "../redis-store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

// Secret token to authenticate track management
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/**
 * POST /api/position/clear
 * Clears track history from Redis
 *
 * Query params:
 * - mode: "gpx" (default) - Clear only GPX uploaded data, preserve SignalK data
 * - mode: "all" - Clear ALL track data including SignalK positions
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

  // Get clear mode from query params
  const mode = request.nextUrl.searchParams.get("mode") || "gpx";

  try {
    let result: { cleared: number };
    let message: string;

    if (mode === "all") {
      // Clear ALL track data including SignalK
      result = await clearAllTrackDataAsync();
      message = `Cleared ALL ${result.cleared} track positions (including SignalK)`;
    } else {
      // Default: Clear only GPX data, preserve SignalK
      result = await clearTrackHistoryAsync();
      message = `Cleared ${result.cleared} GPX track positions (SignalK preserved)`;
    }

    return NextResponse.json({
      success: true,
      message,
      cleared: result.cleared,
      mode,
    });
  } catch (error) {
    console.error("[Clear Track] Error:", error);
    return NextResponse.json(
      { error: "Failed to clear track history", details: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { clearTrackHistoryAsync, clearAllTrackDataAsync } from "../redis-store";
import { requireAuth } from "../auth";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

/**
 * POST /api/position/clear
 * Clears track history from Redis
 *
 * Query params:
 * - mode: "gpx" (default) - Clear only GPX uploaded data, preserve SignalK data
 * - mode: "all" - Clear ALL track data including SignalK positions.
 *   Requires confirm=DELETE-ALL-TRACK-DATA.
 */
export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  // Get clear mode from query params
  const mode = request.nextUrl.searchParams.get("mode") || "gpx";

  // Destroying the entire track takes more than a single mistyped query
  // parameter. This endpoint is one plausible explanation for the track data
  // that has already gone missing.
  if (mode === "all") {
    const confirm = request.nextUrl.searchParams.get("confirm");
    if (confirm !== "DELETE-ALL-TRACK-DATA") {
      return NextResponse.json(
        {
          error: "Confirmation required",
          message:
            "mode=all erases every stored position, including live tracking " +
            "history. Repeat the request with confirm=DELETE-ALL-TRACK-DATA " +
            "if that is genuinely what you want.",
        },
        { status: 400 }
      );
    }
  }

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

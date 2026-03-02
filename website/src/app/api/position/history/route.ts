import { NextRequest, NextResponse } from "next/server";
import { parseLocalTimestampToUtc } from "../store";
import { getPositionHistoryAsync } from "../redis-store";

// Force dynamic to prevent Next.js from caching history data
export const dynamic = "force-dynamic";

/**
 * GET /api/position/history
 * Returns historical positions for track plotting
 *
 * Query params:
 * - limit: number of positions to return (default: 100, max: 1000)
 * - since: ISO timestamp to filter positions after
 */
export async function GET(request: NextRequest) {
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "100"),
    1000
  );
  const since = request.nextUrl.searchParams.get("since");

  let history = await getPositionHistoryAsync();

  // Filter by timestamp if provided
  if (since) {
    const sinceDate = new Date(since);
    history = history.filter(
      (p) => parseLocalTimestampToUtc(p.timestamp, p.timezone) >= sinceDate
    );
  }

  // Limit results
  history = history.slice(0, limit);

  return NextResponse.json({
    positions: history,
    count: history.length,
  });
}

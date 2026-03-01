import { NextRequest, NextResponse } from "next/server";
import { getPositionHistory } from "../store";

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

  let history = getPositionHistory();

  // Filter by timestamp if provided
  if (since) {
    const sinceDate = new Date(since);
    history = history.filter((p) => new Date(p.timestamp) >= sinceDate);
  }

  // Limit results
  history = history.slice(0, limit);

  return NextResponse.json({
    positions: history,
    count: history.length,
  });
}

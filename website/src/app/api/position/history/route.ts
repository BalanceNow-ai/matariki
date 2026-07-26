import { NextRequest, NextResponse } from "next/server";
import { parseLocalTimestampToUtc } from "../store";
import { getPositionHistoryAsync } from "../redis-store";
import {
  getPositionHistoryAsync as getPostgresHistoryAsync,
  countPositionsInRangeAsync,
  isPostgresConfigured,
} from "../postgres-store";

// Force dynamic to prevent Next.js from caching history data
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 10_000;

function parseLimit(value: string | null): number {
  const n = parseInt(value || "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/**
 * GET /api/position/history
 * Historical positions for track plotting.
 *
 * Reads from Postgres when configured, so results are not capped by whatever
 * happens to remain in the Redis rolling buffer.  A storage failure returns
 * 503 rather than an empty list, so "the boat is stationary" and "the database
 * is unreachable" cannot be confused.
 *
 * Query params:
 *   limit  positions to return (default 100, max 10000)
 *   since  ISO timestamp; only positions at or after this time
 *   until  ISO timestamp; only positions at or before this time
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = parseLimit(params.get("limit"));
  const sinceParam = params.get("since");
  const untilParam = params.get("until");

  const since = sinceParam ? new Date(sinceParam) : undefined;
  const until = untilParam ? new Date(untilParam) : undefined;

  if (since && Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid 'since' timestamp" }, { status: 400 });
  }
  if (until && Number.isNaN(until.getTime())) {
    return NextResponse.json({ error: "Invalid 'until' timestamp" }, { status: 400 });
  }

  if (isPostgresConfigured()) {
    try {
      const [positions, totalInRange] = await Promise.all([
        since || until
          ? getPostgresHistoryAsync(limit, 0).then((rows) =>
              rows.filter((p) => {
                const t = new Date(p.timestamp).getTime();
                if (since && t < since.getTime()) return false;
                if (until && t > until.getTime()) return false;
                return true;
              })
            )
          : getPostgresHistoryAsync(limit, 0),
        countPositionsInRangeAsync(since, until),
      ]);

      return NextResponse.json({
        source: "postgres",
        positions,
        count: positions.length,
        totalInRange,
      });
    } catch (error) {
      console.error("[History] Postgres read failed:", error);
      return NextResponse.json(
        {
          error: "Position history is temporarily unavailable",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 503 }
      );
    }
  }

  // Redis fallback.
  try {
    let history = await getPositionHistoryAsync();

    if (since) {
      history = history.filter(
        (p) => parseLocalTimestampToUtc(p.timestamp, p.timezone) >= since
      );
    }
    if (until) {
      history = history.filter(
        (p) => parseLocalTimestampToUtc(p.timestamp, p.timezone) <= until
      );
    }

    history = history.slice(0, limit);

    return NextResponse.json({
      source: "redis",
      positions: history,
      count: history.length,
    });
  } catch (error) {
    console.error("[History] Redis read failed:", error);
    return NextResponse.json(
      { error: "Position history is temporarily unavailable" },
      { status: 503 }
    );
  }
}

import { NextResponse } from "next/server";
import { calculatePositionAgeMs } from "../store";
import {
  getLatestPositionAsync,
  hasLatestPositionAsync,
  getRequestLogAsync,
} from "../redis-store";
import { assessTracking, formatAge } from "../tracking-status";

export const dynamic = "force-dynamic";

/**
 * GET /api/position/status
 *
 * A small, public summary of how tracking is doing, for the map UI to poll.
 *
 * The full health endpoint reads the whole permanent track, which is far too
 * expensive to call from every visitor's browser every minute. This returns
 * only what the UI needs to decide whether it may say the position is live.
 */
export async function GET() {
  const now = Date.now();

  const [hasLive, position, requestLog] = await Promise.all([
    hasLatestPositionAsync(),
    getLatestPositionAsync(),
    getRequestLogAsync(),
  ]);

  const fixAgeMs = calculatePositionAgeMs(position);
  const lastContactAt = requestLog[0]?.timestamp ?? null;

  const tracking = assessTracking({
    now,
    lastContactAt,
    lastFixAt: position.timestamp ?? null,
    fixAgeMs,
    hasLiveFix: hasLive && position.source !== "fallback",
  });

  return NextResponse.json(
    {
      condition: tracking.condition,
      summary: tracking.summary,
      lastFixAt: position.timestamp,
      lastFixAgeMs: fixAgeMs,
      lastFixAge: formatAge(fixAgeMs),
      lastContactAt,
      lastContactAgeMs: lastContactAt
        ? now - new Date(lastContactAt).getTime()
        : null,
      source: position.source,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
  );
}

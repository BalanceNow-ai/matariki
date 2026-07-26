import { NextRequest, NextResponse } from "next/server";
import {
  getPermanentTrackAsync,
  getLatestPositionAsync,
  getRecentPositionHistoryAsync,
  isRedisConfigured,
} from "../redis-store";
import { getTrackAsync, isPostgresConfigured } from "../postgres-store";
import type { SignalKPosition } from "../store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

const HISTORY_MERGE_LIMIT = 50_000;
/** Upper bound on points returned to the map in one response. */
const DEFAULT_MAX_POINTS = 8000;

/**
 * Merge recent positionHistory entries into the permanent track.
 *
 * Only used for the Redis fallback path.  The permanent track only stores
 * positions >200m apart, which means recent small movements (harbour
 * manoeuvring, slow sailing) are invisible on the map.  This appends any
 * positionHistory entries newer than the newest permanent-track point.
 */
function mergeRecentHistory(
  permanentTrack: SignalKPosition[],
  positionHistory: SignalKPosition[]
): SignalKPosition[] {
  if (positionHistory.length === 0) return permanentTrack;

  let newestTrackTs = 0;
  for (const p of permanentTrack) {
    const ts = new Date(p.timestamp).getTime();
    if (Number.isFinite(ts) && ts > newestTrackTs) newestTrackTs = ts;
  }

  const recentPoints = positionHistory.filter(
    (p) => new Date(p.timestamp).getTime() > newestTrackTs
  );

  if (recentPoints.length === 0) return permanentTrack;

  return [...permanentTrack, ...downsample(recentPoints, 50)];
}

/**
 * Distance-based down-sampling: keep the first point, then only points
 * >minMeters from the last kept point, plus always the last point.
 */
function downsample(
  points: SignalKPosition[],
  minMeters: number
): SignalKPosition[] {
  if (points.length <= 2) return [...points];

  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const result: SignalKPosition[] = [sorted[0]];
  let lastKept = sorted[0];

  for (let i = 1; i < sorted.length - 1; i++) {
    const d = haversineMeters(
      lastKept.latitude,
      lastKept.longitude,
      sorted[i].latitude,
      sorted[i].longitude
    );
    if (d >= minMeters) {
      result.push(sorted[i]);
      lastKept = sorted[i];
    }
  }

  result.push(sorted[sorted.length - 1]);
  return result;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Chronological ordering across sources.  Time first — sorting by segmentIndex
 * first placed every imported GPX point before every live point regardless of
 * when it was recorded.
 */
function compareChronological(a: SignalKPosition, b: SignalKPosition): number {
  const ta = new Date(a.timestamp).getTime();
  const tb = new Date(b.timestamp).getTime();
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;

  const segA = a.segmentIndex ?? 0;
  const segB = b.segmentIndex ?? 0;
  if (segA !== segB) return segA - segB;

  return (a.pointIndex ?? 0) - (b.pointIndex ?? 0);
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseLimit(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * GET /api/position/track
 *
 * Serves the rendered track.  Postgres is the source when configured — it
 * holds the complete history including GPX imports — and Redis is used only
 * as a fallback when Postgres is unavailable.
 *
 * Query params:
 *   type   "permanent" | "history" | "all" (default "all")
 *   limit  max points returned (default 8000, thinned server-side)
 *   since / until  ISO timestamps bounding the window
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "all";
  const maxPoints = parseLimit(params.get("limit"), DEFAULT_MAX_POINTS);
  const since = parseDate(params.get("since"));
  const until = parseDate(params.get("until"));

  const latestPosition = await getLatestPositionAsync();

  // Preferred path: the durable store.
  if (isPostgresConfigured()) {
    try {
      const { points, total, stride } = await getTrackAsync({ since, until, maxPoints });

      return NextResponse.json(
        {
          source: "postgres",
          redisConfigured: isRedisConfigured(),
          timestamp: new Date().toISOString(),
          latestPosition,
          track: {
            count: points.length,
            totalStored: total,
            downsampledBy: stride,
            points,
          },
          // Retained for the existing map client, which reads positionHistory.
          positionHistory: { count: points.length, points },
          permanentTrack: { count: points.length, points },
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
      );
    } catch (error) {
      console.error("[Track] Postgres read failed, falling back to Redis:", error);
    }
  }

  // Fallback: Redis only.  This can only show what the rolling buffers hold.
  const result: {
    source: string;
    redisConfigured: boolean;
    timestamp: string;
    degraded?: boolean;
    latestPosition?: unknown;
    permanentTrack?: { count: number; points: unknown[] };
    positionHistory?: { count: number; points: unknown[] };
  } = {
    source: "redis",
    redisConfigured: isRedisConfigured(),
    timestamp: new Date().toISOString(),
    degraded: isPostgresConfigured(),
    latestPosition,
  };

  if (type === "permanent" || type === "all") {
    const track = await getPermanentTrackAsync();
    result.permanentTrack = {
      count: track.length,
      points: track.slice(0, maxPoints),
    };
  }

  if (type === "history" || type === "all") {
    const track = await getPermanentTrackAsync();

    let merged = track;
    try {
      const history = await getRecentPositionHistoryAsync(HISTORY_MERGE_LIMIT);
      merged = mergeRecentHistory(track, history);
    } catch (err) {
      console.error("[Track] Failed to fetch recent history, using permanentTrack only:", err);
    }

    const sorted = [...merged].sort(compareChronological);
    result.positionHistory = {
      count: sorted.length,
      points: sorted.slice(0, maxPoints),
    };
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

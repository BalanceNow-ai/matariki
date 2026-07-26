import { NextRequest, NextResponse } from "next/server";
import {
  getPermanentTrackAsync,
  getLatestPositionAsync,
  getRecentPositionHistoryAsync,
  isRedisConfigured,
} from "../redis-store";
import { getTrackPointsAsync, isPostgresConfigured } from "../postgres-store";
import { simplifyTrackToBudget } from "@/lib/simplify";
import type { SignalKPosition } from "../store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

const HISTORY_MERGE_LIMIT = 50_000;

/**
 * Upper bound on points returned to the map. Higher than it once was because
 * each point now carries only latitude, longitude and time, so this budget
 * costs a fraction of what a tenth as many full position records did.
 */
const DEFAULT_MAX_POINTS = 60_000;

/**
 * How far a point may sit from the line between its neighbours before it is
 * kept. Roughly a boat length: fine enough that a track through a fiord still
 * follows the water, coarse enough to collapse a straight ocean passage.
 */
const DEFAULT_TOLERANCE_M = 12;

/** A jump longer than this is a break in the record, not a course sailed. */
const SEGMENT_GAP_MS = 6 * 60 * 60_000;

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
 *   limit      max points returned (default 60000)
 *   tolerance  simplification tolerance in metres (default 12)
 *   since / until  ISO timestamps bounding the window
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "all";
  const maxPoints = parseLimit(params.get("limit"), DEFAULT_MAX_POINTS);
  const since = parseDate(params.get("since"));
  const until = parseDate(params.get("until"));
  const tolerance = parseLimit(params.get("tolerance"), DEFAULT_TOLERANCE_M);

  const latestPosition = await getLatestPositionAsync();

  // Preferred path: the durable store.
  if (isPostgresConfigured()) {
    try {
      const { points, total, truncated } = await getTrackPointsAsync({ since, until });

      // An empty durable store must not blank a map that Redis can still
      // draw. This matters during the migration: the table is created before
      // it is populated, so preferring Postgres unconditionally would erase
      // the visible track for the duration of the copy, and for good if the
      // migration were never finished.
      if (points.length === 0 && !since && !until) {
        console.warn("[Track] Postgres holds no points; falling back to Redis");
      } else {
        const simplified = simplifyTrackToBudget(points, {
          toleranceMetres: tolerance,
          maxPoints,
          maxGapMs: SEGMENT_GAP_MS,
        });

        // Tag each point with the segment it belongs to. The map needs an
        // explicit boundary: it cannot infer one from distance, because
        // simplification legitimately leaves long straight runs between
        // consecutive points on an ocean passage.
        const labelled = simplified.segmented.flatMap((segment, index) =>
          segment.map((point) => ({ ...point, segmentIndex: index }))
        );

        return NextResponse.json(
          {
            source: "postgres",
            redisConfigured: isRedisConfigured(),
            timestamp: new Date().toISOString(),
            latestPosition,
            track: {
              count: labelled.length,
              totalStored: total,
              toleranceMetres: simplified.toleranceUsed,
              segments: simplified.segments,
              truncated,
              points: labelled,
            },
          },
          {
            headers: {
              // The track changes at most once a minute, and is identical for
              // every visitor. Caching at the edge keeps the cost of reading
              // and simplifying the whole track off the per-request path.
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          }
        );
      }
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

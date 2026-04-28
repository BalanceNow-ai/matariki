import { NextRequest, NextResponse } from "next/server";
import {
  getPermanentTrackAsync,
  getLatestPositionAsync,
  getRecentPositionHistoryAsync,
  isRedisConfigured,
} from "../redis-store";
import type { SignalKPosition } from "../store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";
const HISTORY_MERGE_LIMIT = 50_000;

/**
 * Merge recent positionHistory entries into the permanent track.
 *
 * The permanent track only stores positions >200m apart, which means
 * recent small movements (harbour manoeuvring, slow sailing) are invisible
 * on the map.  This function appends any positionHistory entries that are
 * newer than the newest permanent-track point, so the orange line extends
 * all the way to the vessel's current area of activity.
 */
function mergeRecentHistory(
  permanentTrack: SignalKPosition[],
  positionHistory: SignalKPosition[]
): SignalKPosition[] {
  if (positionHistory.length === 0) return permanentTrack;

  // Find the newest timestamp already in the permanent track
  let newestTrackTs = 0;
  for (const p of permanentTrack) {
    const ts = new Date(p.timestamp).getTime();
    if (ts > newestTrackTs) newestTrackTs = ts;
  }

  // Collect positionHistory points that are newer than the permanent track
  const recentPoints = positionHistory.filter(
    (p) => new Date(p.timestamp).getTime() > newestTrackTs
  );

  if (recentPoints.length === 0) return permanentTrack;

  // Down-sample to avoid sending thousands of near-duplicate stationary pings.
  // Use 50m threshold (not 200m like permanentTrack) so short-range movements
  // like harbour manoeuvring are still visible on the map.
  const sampled = downsample(recentPoints, 50);

  return [...permanentTrack, ...sampled];
}

/**
 * Simple distance-based down-sampling: keep the first point, then only keep
 * subsequent points that are >minMeters from the last kept point, plus always
 * keep the last point.
 */
function downsample(
  points: SignalKPosition[],
  minMeters: number
): SignalKPosition[] {
  if (points.length <= 2) return [...points];

  // Sort chronologically
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

  // Always include the last point so the track reaches the latest position
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
 * GET /api/position/track
 * Returns all track data from Redis for debugging
 *
 * Query params:
 * - type: "permanent" | "history" | "all" (default: "all")
 * - limit: number of positions to return (default: all)
 */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "all";
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam) : undefined;

  const result: {
    redisConfigured: boolean;
    timestamp: string;
    latestPosition?: unknown;
    permanentTrack?: {
      count: number;
      points: unknown[];
    };
    positionHistory?: {
      count: number;
      points: unknown[];
    };
  } = {
    redisConfigured: isRedisConfigured(),
    timestamp: new Date().toISOString(),
  };

  // Always get latest position
  result.latestPosition = await getLatestPositionAsync();

  // Get permanent track
  if (type === "permanent" || type === "all") {
    const track = await getPermanentTrackAsync();
    result.permanentTrack = {
      count: track.length,
      points: limit ? track.slice(0, limit) : track,
    };
  }

  // Get position history for track display.
  // Strategy: permanentTrack is the backbone and MUST always be returned.
  // We only supplement with recent positionHistory to fill the gap between
  // the newest permanent-track point and the current vessel position.
  // If the positionHistory fetch fails, we still return permanentTrack intact.
  if (type === "history" || type === "all") {
    const track = await getPermanentTrackAsync();

    // Always fetch recent history and merge any points newer than the newest
    // permanent track point.  Only merging when the track looked "stale"
    // caused the displayed line to shrink/disappear intermittently whenever a
    // fresh permanent point arrived.
    let merged = track;
    try {
      // Pull a much deeper history window when merging Signalk points.
      // 5,000 points is only ~3.5 days at 1-minute updates, which caused
      // older Signalk track sections to disappear from the rendered line.
      const history = await getRecentPositionHistoryAsync(HISTORY_MERGE_LIMIT);
      merged = mergeRecentHistory(track, history);
    } catch (err) {
      console.error("[Track] Failed to fetch recent history, using permanentTrack only:", err);
    }

    // Sort by segmentIndex first to maintain segment continuity, then by timestamp
    const sorted = [...merged].sort((a, b) => {
      const posA = a as { timestamp: string; segmentIndex?: number };
      const posB = b as { timestamp: string; segmentIndex?: number };
      // First sort by segment (undefined segments go last)
      const segA = posA.segmentIndex ?? Number.MAX_SAFE_INTEGER;
      const segB = posB.segmentIndex ?? Number.MAX_SAFE_INTEGER;
      if (segA !== segB) return segA - segB;
      // Then by timestamp within segment
      return new Date(posA.timestamp).getTime() - new Date(posB.timestamp).getTime();
    });
    result.positionHistory = {
      count: sorted.length,
      points: limit ? sorted.slice(0, limit) : sorted,
    };
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

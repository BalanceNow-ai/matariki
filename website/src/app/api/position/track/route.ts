import { NextRequest, NextResponse } from "next/server";
import {
  getPermanentTrackAsync,
  getLatestPositionAsync,
  isRedisConfigured,
} from "../redis-store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

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

  // Get position history
  // NOTE: permanentTrack is the authoritative source for all track data:
  // - Contains actual vessel movement (positions >200m apart)
  // - Contains GPX imports with full historical data
  // - positionHistory may contain many near-duplicate positions from stationary SignalK updates
  if (type === "history" || type === "all") {
    // Always use permanentTrack as the primary source for track display
    const track = await getPermanentTrackAsync();
    // Sort by segmentIndex first to maintain segment continuity, then by timestamp
    const sorted = [...track].sort((a, b) => {
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

  return NextResponse.json(result);
}

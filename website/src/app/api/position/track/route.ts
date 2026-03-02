import { NextRequest, NextResponse } from "next/server";
import {
  getPermanentTrackAsync,
  getLatestPositionAsync,
  getPositionHistoryAsync,
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
  if (type === "history" || type === "all") {
    const history = await getPositionHistoryAsync();
    result.positionHistory = {
      count: history.length,
      points: limit ? history.slice(0, limit) : history,
    };
  }

  return NextResponse.json(result);
}

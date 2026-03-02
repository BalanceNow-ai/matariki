/**
 * Persistent position storage using Upstash Redis
 * Falls back to in-memory storage if Redis is not configured
 */

import { Redis } from "@upstash/redis";
import type { SignalKPosition, RequestLogEntry } from "./store";

// Redis keys
const KEYS = {
  latestPosition: "matariki:position:latest",
  positionHistory: "matariki:position:history",
  permanentTrack: "matariki:track:permanent",
  lastTrackPosition: "matariki:track:last-position",
  requestLog: "matariki:debug:request-log",
};

const MAX_HISTORY_SIZE = 1000;
const MAX_REQUEST_LOG_SIZE = 50;
const MIN_TRACK_DISTANCE_METERS = 200; // Minimum distance change to store in permanent track

// Initialize Redis client if env vars are present
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    redis = new Redis({ url, token });
    console.log("[Redis] Connected to Upstash Redis");
    return redis;
  }

  console.log("[Redis] No Redis credentials found, using in-memory fallback");
  return null;
}

// Fallback position (Whangarei Marina)
const FALLBACK_POSITION: SignalKPosition = {
  latitude: -35.7275,
  longitude: 174.3278,
  timestamp: new Date().toISOString(),
  source: "fallback",
  name: "Matariki III",
  location: "Whangarei, New Zealand",
};

// In-memory fallback stores
let memoryPosition: SignalKPosition | null = null;
const memoryHistory: SignalKPosition[] = [];
const memoryPermanentTrack: SignalKPosition[] = [];
let memoryLastTrackPosition: SignalKPosition | null = null;
const memoryRequestLog: RequestLogEntry[] = [];

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
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
 * Get the latest position from Redis or memory
 */
export async function getLatestPositionAsync(): Promise<SignalKPosition> {
  const r = getRedis();
  if (r) {
    try {
      const position = await r.get<SignalKPosition>(KEYS.latestPosition);
      return position || FALLBACK_POSITION;
    } catch (error) {
      console.error("[Redis] Error getting position:", error);
    }
  }
  return memoryPosition || FALLBACK_POSITION;
}

/**
 * Set the latest position in Redis or memory
 * Also stores to permanent track if position changed by more than 200m
 */
export async function setLatestPositionAsync(position: SignalKPosition): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      // Set latest position
      await r.set(KEYS.latestPosition, position);

      // Add to history (LPUSH + LTRIM to keep bounded)
      await r.lpush(KEYS.positionHistory, position);
      await r.ltrim(KEYS.positionHistory, 0, MAX_HISTORY_SIZE - 1);

      // Check if we should add to permanent track (distance > 200m from last track point)
      const lastTrackPos = await r.get<SignalKPosition>(KEYS.lastTrackPosition);
      const shouldAddToTrack = !lastTrackPos ||
        calculateDistanceMeters(
          lastTrackPos.latitude,
          lastTrackPos.longitude,
          position.latitude,
          position.longitude
        ) >= MIN_TRACK_DISTANCE_METERS;

      if (shouldAddToTrack) {
        await r.lpush(KEYS.permanentTrack, position);
        await r.set(KEYS.lastTrackPosition, position);
        console.log("[Redis] Position added to permanent track:", position.latitude, position.longitude);
      }

      console.log("[Redis] Position saved:", position.latitude, position.longitude);
      return;
    } catch (error) {
      console.error("[Redis] Error setting position:", error);
    }
  }

  // Fallback to memory
  memoryPosition = position;
  memoryHistory.unshift({ ...position });
  if (memoryHistory.length > MAX_HISTORY_SIZE) {
    memoryHistory.pop();
  }

  // Check if we should add to permanent track (memory fallback)
  const shouldAddToTrack = !memoryLastTrackPosition ||
    calculateDistanceMeters(
      memoryLastTrackPosition.latitude,
      memoryLastTrackPosition.longitude,
      position.latitude,
      position.longitude
    ) >= MIN_TRACK_DISTANCE_METERS;

  if (shouldAddToTrack) {
    memoryPermanentTrack.unshift({ ...position });
    memoryLastTrackPosition = { ...position };
    console.log("[Memory] Position added to permanent track:", position.latitude, position.longitude);
  }
}

/**
 * Get position history from Redis or memory
 */
export async function getPositionHistoryAsync(): Promise<SignalKPosition[]> {
  const r = getRedis();
  if (r) {
    try {
      return await r.lrange<SignalKPosition>(KEYS.positionHistory, 0, -1);
    } catch (error) {
      console.error("[Redis] Error getting history:", error);
    }
  }
  return [...memoryHistory];
}

/**
 * Get permanent track from Redis or memory
 * This contains positions where the vessel moved > 200m from the previous track point
 */
export async function getPermanentTrackAsync(): Promise<SignalKPosition[]> {
  const r = getRedis();
  if (r) {
    try {
      return await r.lrange<SignalKPosition>(KEYS.permanentTrack, 0, -1);
    } catch (error) {
      console.error("[Redis] Error getting permanent track:", error);
    }
  }
  return [...memoryPermanentTrack];
}

/**
 * Check if we have a live position (not fallback)
 */
export async function hasLatestPositionAsync(): Promise<boolean> {
  const r = getRedis();
  if (r) {
    try {
      const exists = await r.exists(KEYS.latestPosition);
      return exists === 1;
    } catch (error) {
      console.error("[Redis] Error checking position:", error);
    }
  }
  return memoryPosition !== null;
}

/**
 * Add a request log entry
 */
export async function addRequestLogAsync(entry: RequestLogEntry): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.lpush(KEYS.requestLog, entry);
      await r.ltrim(KEYS.requestLog, 0, MAX_REQUEST_LOG_SIZE - 1);
      return;
    } catch (error) {
      console.error("[Redis] Error adding log:", error);
    }
  }

  // Fallback to memory
  memoryRequestLog.unshift(entry);
  if (memoryRequestLog.length > MAX_REQUEST_LOG_SIZE) {
    memoryRequestLog.pop();
  }
}

/**
 * Get request log from Redis or memory
 */
export async function getRequestLogAsync(): Promise<RequestLogEntry[]> {
  const r = getRedis();
  if (r) {
    try {
      return await r.lrange<RequestLogEntry>(KEYS.requestLog, 0, -1);
    } catch (error) {
      console.error("[Redis] Error getting log:", error);
    }
  }
  return [...memoryRequestLog];
}

/**
 * Clear the request log
 */
export async function clearRequestLogAsync(): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.del(KEYS.requestLog);
      return;
    } catch (error) {
      console.error("[Redis] Error clearing log:", error);
    }
  }
  memoryRequestLog.length = 0;
}

/**
 * Clear GPX track history while preserving Signal K data
 * Use this to remove GPS artifacts/jumps from the track
 * Signal K data (source: "signalk") is preserved
 */
export async function clearTrackHistoryAsync(): Promise<{ cleared: number }> {
  const r = getRedis();
  let clearedCount = 0;

  if (r) {
    try {
      // Get all positions from history
      const history = await r.lrange<SignalKPosition>(KEYS.positionHistory, 0, -1);
      const track = await r.lrange<SignalKPosition>(KEYS.permanentTrack, 0, -1);

      // Filter to keep only Signal K data (live data from the vessel)
      const signalkHistory = history.filter(pos => pos.source === "signalk");
      const signalkTrack = track.filter(pos => pos.source === "signalk");

      // Calculate how many we're clearing (non-signalk data)
      const historyCleared = history.length - signalkHistory.length;
      const trackCleared = track.length - signalkTrack.length;
      clearedCount = historyCleared + trackCleared;

      // Clear and repopulate with only Signal K data
      await r.del(KEYS.positionHistory);
      await r.del(KEYS.permanentTrack);

      if (signalkHistory.length > 0) {
        // Restore Signal K history (rpush to maintain order)
        await r.rpush(KEYS.positionHistory, ...signalkHistory);
      }

      if (signalkTrack.length > 0) {
        // Restore Signal K permanent track
        await r.rpush(KEYS.permanentTrack, ...signalkTrack);
      }

      // Only clear lastTrackPosition if no Signal K track data remains
      if (signalkTrack.length === 0) {
        await r.del(KEYS.lastTrackPosition);
      }

      console.log(`[Redis] Cleared GPX data: ${historyCleared} history positions, ${trackCleared} track points (preserved ${signalkHistory.length} Signal K positions)`);
      return { cleared: clearedCount };
    } catch (error) {
      console.error("[Redis] Error clearing track history:", error);
    }
  }

  // Fallback to memory - filter to keep only Signal K data
  const signalkHistory = memoryHistory.filter(pos => pos.source === "signalk");
  const signalkTrack = memoryPermanentTrack.filter(pos => pos.source === "signalk");

  clearedCount = (memoryHistory.length - signalkHistory.length) + (memoryPermanentTrack.length - signalkTrack.length);

  memoryHistory.length = 0;
  memoryHistory.push(...signalkHistory);

  memoryPermanentTrack.length = 0;
  memoryPermanentTrack.push(...signalkTrack);

  if (signalkTrack.length === 0) {
    memoryLastTrackPosition = null;
  }

  console.log(`[Memory] Cleared GPX data: ${clearedCount} positions (preserved ${signalkHistory.length} Signal K positions)`);

  return { cleared: clearedCount };
}

/**
 * Import track points from GPX data
 * Adds to the same position history used by SignalK (unified data store)
 * Filters to every 5th point and deduplicates against existing data
 */
export async function importTrackFromGPX(
  trackPoints: Array<{ latitude: number; longitude: number; timestamp: string; name?: string }>
): Promise<{ imported: number; total: number }> {
  const r = getRedis();

  // Filter to every 5th point to reduce density
  const filteredPoints = trackPoints.filter((_, index) => index % 5 === 0);

  console.log(`[GPX Import] Filtering from ${trackPoints.length} to ${filteredPoints.length} points (every 5th)`);

  // Convert to SignalKPosition format - mark as "gpx" source to distinguish from live data
  const positions: SignalKPosition[] = filteredPoints.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp: point.timestamp,
    source: "gpx" as "signalk" | "fallback", // Note: using fallback type but semantically it's GPX
    name: point.name || "Matariki III",
    mmsi: "512004962",
  }));

  if (r) {
    try {
      // Get existing history to deduplicate
      const existingHistory = await r.lrange<SignalKPosition>(KEYS.positionHistory, 0, -1);

      // Filter out positions that are too close to existing ones (within ~100m)
      const newPositions = positions.filter(newPos => {
        return !existingHistory.some(existing => {
          const latDiff = Math.abs(existing.latitude - newPos.latitude);
          const lonDiff = Math.abs(existing.longitude - newPos.longitude);
          // ~100m tolerance
          return latDiff < 0.001 && lonDiff < 0.001;
        });
      });

      if (newPositions.length > 0) {
        // Add GPX points to position history (rpush adds to end, keeping chronological order)
        // Sort by timestamp first to ensure proper order
        newPositions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const BATCH_SIZE = 100;
        for (let i = 0; i < newPositions.length; i += BATCH_SIZE) {
          const batch = newPositions.slice(i, i + BATCH_SIZE);
          await r.rpush(KEYS.positionHistory, ...batch);
        }
      }

      // Also clear the old permanent track if it exists (migrate to unified store)
      await r.del(KEYS.permanentTrack);
      await r.del(KEYS.lastTrackPosition);

      console.log(`[Redis] Imported ${newPositions.length} new track points from GPX (${positions.length - newPositions.length} duplicates skipped)`);
      return { imported: newPositions.length, total: trackPoints.length };
    } catch (error) {
      console.error("[Redis] Error importing GPX:", error);
    }
  }

  // Fallback to memory - add to history instead of separate track
  const newPositions = positions.filter(newPos => {
    return !memoryHistory.some(existing => {
      const latDiff = Math.abs(existing.latitude - newPos.latitude);
      const lonDiff = Math.abs(existing.longitude - newPos.longitude);
      return latDiff < 0.001 && lonDiff < 0.001;
    });
  });

  memoryHistory.push(...newPositions);
  // Sort by timestamp
  memoryHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Clear old permanent track
  memoryPermanentTrack.length = 0;
  memoryLastTrackPosition = null;

  console.log(`[Memory] Imported ${newPositions.length} track points from GPX`);
  return { imported: newPositions.length, total: trackPoints.length };
}

/**
 * Check if Redis is available
 */
export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}

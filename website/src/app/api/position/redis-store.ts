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
 * Clear all track history (position history and permanent track)
 * Use this to remove GPS artifacts/jumps from the track
 */
export async function clearTrackHistoryAsync(): Promise<{ cleared: number }> {
  const r = getRedis();
  let clearedCount = 0;

  if (r) {
    try {
      // Get counts before clearing
      const historyCount = await r.llen(KEYS.positionHistory);
      const trackCount = await r.llen(KEYS.permanentTrack);
      clearedCount = historyCount + trackCount;

      // Clear all track-related keys
      await r.del(KEYS.positionHistory);
      await r.del(KEYS.permanentTrack);
      await r.del(KEYS.lastTrackPosition);

      console.log(`[Redis] Cleared track history: ${historyCount} positions, ${trackCount} track points`);
      return { cleared: clearedCount };
    } catch (error) {
      console.error("[Redis] Error clearing track history:", error);
    }
  }

  // Fallback to memory
  clearedCount = memoryHistory.length + memoryPermanentTrack.length;
  memoryHistory.length = 0;
  memoryPermanentTrack.length = 0;
  memoryLastTrackPosition = null;
  console.log(`[Memory] Cleared track history: ${clearedCount} positions`);

  return { cleared: clearedCount };
}

/**
 * Import track points from GPX data
 * Replaces existing track with imported waypoints
 */
export async function importTrackFromGPX(
  trackPoints: Array<{ latitude: number; longitude: number; timestamp: string; name?: string }>
): Promise<{ imported: number }> {
  const r = getRedis();

  // Convert to SignalKPosition format
  const positions: SignalKPosition[] = trackPoints.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp: point.timestamp,
    source: "fallback" as const, // Mark as imported data
    name: point.name || "Matariki III",
    location: "Imported from GPX",
  }));

  if (r) {
    try {
      // Clear existing track first
      await r.del(KEYS.permanentTrack);
      await r.del(KEYS.lastTrackPosition);

      // Import new track points using batched rpush (much faster than individual calls)
      if (positions.length > 0) {
        // Batch positions into chunks to avoid memory issues with very large imports
        const BATCH_SIZE = 100;
        for (let i = 0; i < positions.length; i += BATCH_SIZE) {
          const batch = positions.slice(i, i + BATCH_SIZE);
          // Use spread to push multiple items in one rpush call
          await r.rpush(KEYS.permanentTrack, ...batch);
        }
        // Set last track position to the most recent point
        await r.set(KEYS.lastTrackPosition, positions[positions.length - 1]);
      }

      console.log(`[Redis] Imported ${positions.length} track points from GPX`);
      return { imported: positions.length };
    } catch (error) {
      console.error("[Redis] Error importing GPX:", error);
    }
  }

  // Fallback to memory
  memoryPermanentTrack.length = 0;
  memoryPermanentTrack.push(...positions.reverse()); // Reverse for memory (newest first)
  memoryLastTrackPosition = positions.length > 0 ? positions[0] : null;
  console.log(`[Memory] Imported ${positions.length} track points from GPX`);

  return { imported: positions.length };
}

/**
 * Check if Redis is available
 */
export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}

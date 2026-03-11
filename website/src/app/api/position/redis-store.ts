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

// Max size for position history - increased to preserve historical GPX data
// Only live SignalK positions are trimmed; GPX imports are preserved
const MAX_HISTORY_SIZE = 10000;
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

      // Add to history (LPUSH without LTRIM to preserve GPX historical data)
      // Historical GPX data is appended at the end; we don't want to trim it
      // List growth is acceptable for tracking use case
      await r.lpush(KEYS.positionHistory, position);

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
  // Don't trim memory history to preserve GPX data (same as Redis)

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
 * Clear GPX track history while preserving Signal K and other data
 * Use this to remove GPS artifacts/jumps from the track
 * Only data with source: "gpx" is deleted
 */
export async function clearTrackHistoryAsync(): Promise<{ cleared: number }> {
  const r = getRedis();
  let clearedCount = 0;

  if (r) {
    try {
      // Get all positions from history
      const history = await r.lrange<SignalKPosition>(KEYS.positionHistory, 0, -1);
      const track = await r.lrange<SignalKPosition>(KEYS.permanentTrack, 0, -1);

      // Filter to keep everything EXCEPT GPX data (only delete source: "gpx")
      const nonGpxHistory = history.filter(pos => pos.source !== "gpx");
      const nonGpxTrack = track.filter(pos => pos.source !== "gpx");

      // Calculate how many GPX positions we're clearing
      const historyCleared = history.length - nonGpxHistory.length;
      const trackCleared = track.length - nonGpxTrack.length;
      clearedCount = historyCleared + trackCleared;

      // Clear and repopulate with non-GPX data
      await r.del(KEYS.positionHistory);
      await r.del(KEYS.permanentTrack);

      if (nonGpxHistory.length > 0) {
        // Restore non-GPX history (rpush to maintain order)
        await r.rpush(KEYS.positionHistory, ...nonGpxHistory);
      }

      if (nonGpxTrack.length > 0) {
        // Restore non-GPX permanent track
        await r.rpush(KEYS.permanentTrack, ...nonGpxTrack);
      }

      // Only clear lastTrackPosition if no track data remains
      if (nonGpxTrack.length === 0) {
        await r.del(KEYS.lastTrackPosition);
      }

      console.log(`[Redis] Cleared GPX data: ${historyCleared} history positions, ${trackCleared} track points (preserved ${nonGpxHistory.length} non-GPX positions)`);
      return { cleared: clearedCount };
    } catch (error) {
      console.error("[Redis] Error clearing track history:", error);
    }
  }

  // Fallback to memory - filter to keep everything EXCEPT GPX data
  const nonGpxHistory = memoryHistory.filter(pos => pos.source !== "gpx");
  const nonGpxTrack = memoryPermanentTrack.filter(pos => pos.source !== "gpx");

  clearedCount = (memoryHistory.length - nonGpxHistory.length) + (memoryPermanentTrack.length - nonGpxTrack.length);

  memoryHistory.length = 0;
  memoryHistory.push(...nonGpxHistory);

  memoryPermanentTrack.length = 0;
  memoryPermanentTrack.push(...nonGpxTrack);

  if (nonGpxTrack.length === 0) {
    memoryLastTrackPosition = null;
  }

  console.log(`[Memory] Cleared GPX data: ${clearedCount} positions (preserved ${nonGpxHistory.length} non-GPX positions)`);

  return { cleared: clearedCount };
}

/**
 * Normalize a timestamp to ISO 8601 format for consistent storage
 * Both SignalK and GPX data should use the same format
 */
function normalizeTimestamp(timestamp: string): string {
  // If already ISO format with T, return as-is
  if (timestamp.includes("T")) {
    return timestamp;
  }
  // If "YYYY-MM-DD HH:MM:SS" format, convert to ISO
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    return timestamp.replace(" ", "T") + "Z";
  }
  // Otherwise return as-is and let JS handle it
  return timestamp;
}

/**
 * Import track points from GPX data
 * Adds to the same position history AND permanentTrack used by SignalK (unified data store)
 * All points are imported with timestamps preserved for proper track ordering
 * Deduplication is by timestamp only (vessel may revisit locations)
 */
export async function importTrackFromGPX(
  trackPoints: Array<{ latitude: number; longitude: number; timestamp: string; name?: string; segmentIndex?: number }>
): Promise<{ imported: number; total: number }> {
  const r = getRedis();

  // Keep all points - timestamps are preserved for proper track ordering
  // No filtering needed - the track renderer sorts by timestamp
  const filteredPoints = trackPoints;

  console.log(`[GPX Import] Importing all ${filteredPoints.length} track points with timestamps`);

  // Convert to SignalKPosition format - mark as "gpx" source to distinguish from live data
  // Normalize timestamps to ISO format for consistency with SignalK data
  const positions: SignalKPosition[] = filteredPoints.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp: normalizeTimestamp(point.timestamp),
    source: "gpx",
    name: point.name || "Matariki III",
    mmsi: "512004962",
    segmentIndex: point.segmentIndex,
  }));

  if (r) {
    try {
      // Get existing history to deduplicate by timestamp (not location - vessel may revisit areas)
      const existingHistory = await r.lrange<SignalKPosition>(KEYS.positionHistory, 0, -1);
      const existingTimestamps = new Set(existingHistory.map(p => normalizeTimestamp(p.timestamp)));

      // Filter out positions with duplicate timestamps only
      const newPositions = positions.filter(newPos => !existingTimestamps.has(newPos.timestamp));

      if (newPositions.length > 0) {
        // Sort by timestamp to ensure proper chronological order for track drawing
        newPositions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Add to position history
        const BATCH_SIZE = 100;
        for (let i = 0; i < newPositions.length; i += BATCH_SIZE) {
          const batch = newPositions.slice(i, i + BATCH_SIZE);
          await r.rpush(KEYS.positionHistory, ...batch);
        }

        // Also add to permanentTrack (same as SignalK) with 200m distance filtering
        // This ensures GPX data appears in the permanent track just like live SignalK data
        let lastTrackPos = await r.get<SignalKPosition>(KEYS.lastTrackPosition);
        const trackPointsToAdd: SignalKPosition[] = [];

        for (const pos of newPositions) {
          const shouldAddToTrack = !lastTrackPos ||
            calculateDistanceMeters(
              lastTrackPos.latitude,
              lastTrackPos.longitude,
              pos.latitude,
              pos.longitude
            ) >= MIN_TRACK_DISTANCE_METERS;

          if (shouldAddToTrack) {
            trackPointsToAdd.push(pos);
            lastTrackPos = pos;
          }
        }

        if (trackPointsToAdd.length > 0) {
          for (let i = 0; i < trackPointsToAdd.length; i += BATCH_SIZE) {
            const batch = trackPointsToAdd.slice(i, i + BATCH_SIZE);
            await r.rpush(KEYS.permanentTrack, ...batch);
          }
          // Update last track position
          await r.set(KEYS.lastTrackPosition, lastTrackPos);
          console.log(`[Redis] Added ${trackPointsToAdd.length} GPX points to permanent track (200m filtered)`);
        }
      }

      console.log(`[Redis] Imported ${newPositions.length} new track points from GPX (${positions.length - newPositions.length} duplicates skipped)`);
      return { imported: newPositions.length, total: trackPoints.length };
    } catch (error) {
      console.error("[Redis] Error importing GPX:", error);
    }
  }

  // Fallback to memory - add to history AND permanent track
  // Deduplicate by timestamp only (not location - vessel may revisit areas)
  const existingTimestamps = new Set(memoryHistory.map(p => normalizeTimestamp(p.timestamp)));
  const newPositions = positions.filter(newPos => !existingTimestamps.has(newPos.timestamp));

  // Sort by timestamp
  newPositions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  memoryHistory.push(...newPositions);
  // Sort the entire history by timestamp
  memoryHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Also add to permanent track with distance filtering (same as SignalK)
  let trackPointsAdded = 0;
  for (const pos of newPositions) {
    const shouldAddToTrack = !memoryLastTrackPosition ||
      calculateDistanceMeters(
        memoryLastTrackPosition.latitude,
        memoryLastTrackPosition.longitude,
        pos.latitude,
        pos.longitude
      ) >= MIN_TRACK_DISTANCE_METERS;

    if (shouldAddToTrack) {
      memoryPermanentTrack.push({ ...pos });
      memoryLastTrackPosition = { ...pos };
      trackPointsAdded++;
    }
  }

  console.log(`[Memory] Imported ${newPositions.length} track points from GPX, ${trackPointsAdded} added to permanent track`);
  return { imported: newPositions.length, total: trackPoints.length };
}

/**
 * Check if Redis is available
 */
export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}

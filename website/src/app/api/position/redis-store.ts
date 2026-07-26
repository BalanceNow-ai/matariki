/**
 * Persistent position storage using Upstash Redis + Neon Postgres
 *
 * Redis: current position, recent buffer (1000 positions), request logs
 * Postgres: full historical position data (unlimited)
 *
 * Falls back to in-memory storage if Redis is not configured
 */

import { Redis } from "@upstash/redis";
import type { SignalKPosition, RequestLogEntry } from "./store";
import { storePositionAsync as storeInPostgres, isPostgresConfigured } from "./postgres-store";

// Redis keys
const KEYS = {
  latestPosition: "matariki:position:latest",
  positionHistory: "matariki:position:history",
  permanentTrack: "matariki:track:permanent",
  lastTrackPosition: "matariki:track:last-position",
  requestLog: "matariki:debug:request-log",
  migrationComplete: "matariki:migration:postgres-complete",
};

// Redis keeps a rolling buffer of recent positions; Postgres stores full history
const MAX_REDIS_HISTORY_SIZE = 1000;
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

// Once the backlog is confirmed in Postgres this never goes back to false, so
// the flag is cached after the first positive read.
let migrationCompleteCache = false;

/**
 * Has the historical Redis backlog been copied into Postgres?
 *
 * The Redis history list is only ever trimmed once this is true.  Until then
 * Redis remains the sole copy of everything older than the rolling buffer and
 * must not be truncated.
 */
export async function isPostgresMigrationCompleteAsync(): Promise<boolean> {
  if (migrationCompleteCache) return true;

  const r = getRedis();
  if (!r) return false;

  try {
    const flag = await r.get<string | boolean>(KEYS.migrationComplete);
    if (flag) {
      migrationCompleteCache = true;
      return true;
    }
  } catch (error) {
    console.error("[Redis] Error reading migration flag:", error);
  }
  return false;
}

/** Record that the Postgres migration finished and verified. */
export async function setPostgresMigrationCompleteAsync(
  details: Record<string, unknown>
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(KEYS.migrationComplete, JSON.stringify({ at: new Date().toISOString(), ...details }));
  migrationCompleteCache = true;
}

/** Clear the flag (re-enables full retention in Redis). */
export async function clearPostgresMigrationFlagAsync(): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(KEYS.migrationComplete);
  migrationCompleteCache = false;
}

/** List lengths without transferring the lists themselves. */
export async function getStoreLengthsAsync(): Promise<{
  history: number;
  permanentTrack: number;
}> {
  const r = getRedis();
  if (!r) {
    return { history: memoryHistory.length, permanentTrack: memoryPermanentTrack.length };
  }
  const [history, permanentTrack] = await Promise.all([
    r.llen(KEYS.positionHistory),
    r.llen(KEYS.permanentTrack),
  ]);
  return { history, permanentTrack };
}

/** Read a slice of a stored list, for chunked migration. */
export async function getListRangeAsync(
  list: "history" | "permanentTrack",
  start: number,
  stop: number
): Promise<SignalKPosition[]> {
  const key = list === "history" ? KEYS.positionHistory : KEYS.permanentTrack;
  const r = getRedis();
  if (!r) {
    const source = list === "history" ? memoryHistory : memoryPermanentTrack;
    return source.slice(start, stop + 1);
  }
  return await r.lrange<SignalKPosition>(key, start, stop);
}

export type PositionWriteResult = {
  postgres: "ok" | "failed" | "not-configured";
  redis: "ok" | "failed" | "not-configured";
  /** Whether the Redis history list was trimmed on this write. */
  trimmed: boolean;
  /** True when at least one store that survives a restart accepted the write. */
  durable: boolean;
};

/**
 * Set the latest position in Redis or memory
 * Also stores to permanent track if position changed by more than 200m
 *
 * Includes a staleness guard: if the incoming position is older than the
 * currently stored position, it is added to history/track but does NOT
 * overwrite latestPosition.  This prevents msp-webhook replaying queued
 * old messages from jumping the marker back to an old location.
 */
export async function setLatestPositionAsync(
  position: SignalKPosition
): Promise<PositionWriteResult> {
  // Durable store first — Postgres is the record of last resort, so we want to
  // know whether it accepted the position before deciding what Redis may drop.
  let postgres: PositionWriteResult["postgres"] = "not-configured";
  if (isPostgresConfigured()) {
    try {
      postgres = (await storeInPostgres(position)) ? "ok" : "failed";
    } catch (error) {
      console.error("[Postgres] Failed to store position:", error);
      postgres = "failed";
    }
  }

  let redisFailed = false;
  const r = getRedis();
  if (r) {
    try {
      // Staleness guard: only overwrite latestPosition if this position
      // is newer than (or same age as) the currently stored one.
      const current = await r.get<SignalKPosition>(KEYS.latestPosition);
      const incomingTs = new Date(position.timestamp).getTime();
      const currentTs = current ? new Date(current.timestamp).getTime() : 0;

      if (incomingTs >= currentTs) {
        await r.set(KEYS.latestPosition, position);
      } else {
        console.log(
          "[Redis] Skipping latestPosition update - incoming position is older:",
          position.timestamp, "vs current:", current?.timestamp
        );
      }

      // Add to Redis history buffer
      await r.lpush(KEYS.positionHistory, position);

      // Trim ONLY when the historical backlog is confirmed in Postgres and this
      // position landed there too.  Trimming before the migration has run would
      // delete history that exists nowhere else — the failure this whole
      // Postgres layer was introduced to prevent.
      let trimmed = false;
      if (postgres === "ok" && (await isPostgresMigrationCompleteAsync())) {
        await r.ltrim(KEYS.positionHistory, 0, MAX_REDIS_HISTORY_SIZE - 1);
        trimmed = true;
      }

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
      return { postgres, redis: "ok", trimmed, durable: true };
    } catch (error) {
      console.error("[Redis] Error setting position:", error);
      redisFailed = true;
    }
  }

  // Fallback to memory (with staleness guard)
  const memTs = memoryPosition ? new Date(memoryPosition.timestamp).getTime() : 0;
  const incTs = new Date(position.timestamp).getTime();
  if (incTs >= memTs) {
    memoryPosition = position;
  }
  memoryHistory.unshift({ ...position });
  // Trim memory history too
  if (memoryHistory.length > MAX_REDIS_HISTORY_SIZE) {
    memoryHistory.length = MAX_REDIS_HISTORY_SIZE;
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

  // Per-lambda memory is not durable, so this position only survives if
  // Postgres accepted it.
  return {
    postgres,
    redis: redisFailed ? "failed" : "not-configured",
    trimmed: false,
    durable: postgres === "ok",
  };
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
 * Get the most recent N positions from history (LPUSH order = newest first).
 * Much faster than getPositionHistoryAsync() when the list is large.
 */
export async function getRecentPositionHistoryAsync(
  limit: number = 2000
): Promise<SignalKPosition[]> {
  const r = getRedis();
  if (r) {
    try {
      return await r.lrange<SignalKPosition>(KEYS.positionHistory, 0, limit - 1);
    } catch (error) {
      console.error("[Redis] Error getting recent history:", error);
    }
  }
  return memoryHistory.slice(0, limit);
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
 * Get the lastTrackPosition reference point used for the 200m distance threshold
 */
export async function getLastTrackPositionAsync(): Promise<SignalKPosition | null> {
  const r = getRedis();
  if (r) {
    try {
      return await r.get<SignalKPosition>(KEYS.lastTrackPosition);
    } catch (error) {
      console.error("[Redis] Error getting lastTrackPosition:", error);
    }
  }
  return memoryLastTrackPosition;
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
 * Clear ALL track data from Redis (position history, permanent track, latest position)
 * Use this to completely reset the tracking system
 */
export async function clearAllTrackDataAsync(): Promise<{ cleared: number }> {
  const r = getRedis();
  let clearedCount = 0;

  if (r) {
    try {
      // Get counts before clearing
      const historyCount = await r.llen(KEYS.positionHistory);
      const trackCount = await r.llen(KEYS.permanentTrack);
      clearedCount = historyCount + trackCount;

      // Delete all track-related keys
      await r.del(KEYS.positionHistory);
      await r.del(KEYS.permanentTrack);
      await r.del(KEYS.lastTrackPosition);
      await r.del(KEYS.latestPosition);

      console.log(`[Redis] Cleared ALL track data: ${historyCount} history positions, ${trackCount} track points`);
      return { cleared: clearedCount };
    } catch (error) {
      console.error("[Redis] Error clearing all track data:", error);
    }
  }

  // Fallback to memory
  clearedCount = memoryHistory.length + memoryPermanentTrack.length;
  memoryHistory.length = 0;
  memoryPermanentTrack.length = 0;
  memoryLastTrackPosition = null;
  memoryPosition = null;

  console.log(`[Memory] Cleared ALL track data: ${clearedCount} positions`);
  return { cleared: clearedCount };
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
      // Deduplicate against permanentTrack by timestamp
      // (positionHistory is not reliably populated; permanentTrack is the authoritative store)
      const existingTrack = await r.lrange<SignalKPosition>(KEYS.permanentTrack, 0, -1);
      const existingTimestamps = new Set(existingTrack.map(p => p.timestamp));

      // Filter out positions with duplicate timestamps only
      const newPositions = positions.filter(newPos => !existingTimestamps.has(newPos.timestamp));

      if (newPositions.length > 0) {
        // Sort by segmentIndex first, then by timestamp within segments
        // This maintains GPX track segment continuity
        newPositions.sort((a, b) => {
          const segA = a.segmentIndex ?? Number.MAX_SAFE_INTEGER;
          const segB = b.segmentIndex ?? Number.MAX_SAFE_INTEGER;
          if (segA !== segB) return segA - segB;
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

        // Write to permanentTrack (the reliable store) instead of positionHistory
        const BATCH_SIZE = 100;
        for (let i = 0; i < newPositions.length; i += BATCH_SIZE) {
          const batch = newPositions.slice(i, i + BATCH_SIZE);
          await r.rpush(KEYS.permanentTrack, ...batch);
        }

        // Update lastTrackPosition to the last imported point for SignalK consistency
        const lastImportedPos = newPositions[newPositions.length - 1];
        await r.set(KEYS.lastTrackPosition, lastImportedPos);
        console.log(`[Redis] Updated lastTrackPosition to ${lastImportedPos.latitude}, ${lastImportedPos.longitude}`);
      }

      console.log(`[Redis] Imported ${newPositions.length} new GPX track points to permanentTrack (${positions.length - newPositions.length} duplicates skipped)`);
      return { imported: newPositions.length, total: trackPoints.length };
    } catch (error) {
      console.error("[Redis] Error importing GPX:", error);
    }
  }

  // Fallback to memory - add to history AND permanent track
  // Deduplicate by timestamp only (not location - vessel may revisit areas)
  const existingTimestamps = new Set(memoryHistory.map(p => normalizeTimestamp(p.timestamp)));
  const newPositions = positions.filter(newPos => !existingTimestamps.has(newPos.timestamp));

  // Sort by segmentIndex first, then by timestamp within segments
  newPositions.sort((a, b) => {
    const segA = a.segmentIndex ?? Number.MAX_SAFE_INTEGER;
    const segB = b.segmentIndex ?? Number.MAX_SAFE_INTEGER;
    if (segA !== segB) return segA - segB;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  memoryHistory.push(...newPositions);
  // Sort the entire history by segmentIndex, then timestamp
  memoryHistory.sort((a, b) => {
    const segA = a.segmentIndex ?? Number.MAX_SAFE_INTEGER;
    const segB = b.segmentIndex ?? Number.MAX_SAFE_INTEGER;
    if (segA !== segB) return segA - segB;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

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

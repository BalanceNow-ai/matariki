/**
 * PostgreSQL storage for position history using Neon serverless
 *
 * Redis handles: current position, recent buffer (last 1000), request logs
 * Postgres handles: full historical position data (unlimited)
 */

import { neon } from "@neondatabase/serverless";
import type { SignalKPosition } from "./store";

// Get database connection
function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    return null;
  }
  return neon(connectionString);
}

export function isPostgresConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

/**
 * Initialize the positions table if it doesn't exist
 */
export async function initializePostgres(): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        source VARCHAR(50) DEFAULT 'signalk',
        speed_over_ground DOUBLE PRECISION,
        course_over_ground DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        depth DOUBLE PRECISION,
        apparent_wind_speed DOUBLE PRECISION,
        apparent_wind_angle DOUBLE PRECISION,
        water_temperature DOUBLE PRECISION,
        name VARCHAR(100),
        mmsi VARCHAR(20),
        location VARCHAR(255),
        segment_index INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create index on timestamp for efficient range queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_positions_timestamp ON positions(timestamp DESC)
    `;

    // Create index on source for filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_positions_source ON positions(source)
    `;

    console.log("[Postgres] Tables initialized successfully");
    return true;
  } catch (error) {
    console.error("[Postgres] Failed to initialize:", error);
    return false;
  }
}

/**
 * Store a position in Postgres
 */
export async function storePositionAsync(position: SignalKPosition): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;

  try {
    await sql`
      INSERT INTO positions (
        latitude, longitude, timestamp, source,
        speed_over_ground, course_over_ground, heading, depth,
        apparent_wind_speed, apparent_wind_angle, water_temperature,
        name, mmsi, location, segment_index
      ) VALUES (
        ${position.latitude},
        ${position.longitude},
        ${position.timestamp},
        ${position.source || 'signalk'},
        ${position.speedOverGround || null},
        ${position.courseOverGround || null},
        ${position.heading || null},
        ${position.depth || null},
        ${position.apparentWindSpeed || null},
        ${position.apparentWindAngle || null},
        ${position.waterTemperature || null},
        ${position.name || null},
        ${position.mmsi || null},
        ${position.location || null},
        ${position.segmentIndex || null}
      )
    `;
    return true;
  } catch (error) {
    console.error("[Postgres] Failed to store position:", error);
    return false;
  }
}

/**
 * Get position history from Postgres
 */
export async function getPositionHistoryAsync(
  limit: number = 10000,
  offset: number = 0
): Promise<SignalKPosition[]> {
  const sql = getDb();
  if (!sql) return [];

  try {
    const rows = await sql`
      SELECT
        latitude, longitude, timestamp, source,
        speed_over_ground as "speedOverGround",
        course_over_ground as "courseOverGround",
        heading, depth,
        apparent_wind_speed as "apparentWindSpeed",
        apparent_wind_angle as "apparentWindAngle",
        water_temperature as "waterTemperature",
        name, mmsi, location,
        segment_index as "segmentIndex"
      FROM positions
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return rows.map((row) => ({
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      timestamp: (row.timestamp as Date).toISOString(),
      source: row.source as string,
      speedOverGround: row.speedOverGround as number | undefined,
      courseOverGround: row.courseOverGround as number | undefined,
      heading: row.heading as number | undefined,
      depth: row.depth as number | undefined,
      apparentWindSpeed: row.apparentWindSpeed as number | undefined,
      apparentWindAngle: row.apparentWindAngle as number | undefined,
      waterTemperature: row.waterTemperature as number | undefined,
      name: row.name as string | undefined,
      mmsi: row.mmsi as string | undefined,
      location: row.location as string | undefined,
      segmentIndex: row.segmentIndex as number | undefined,
    }));
  } catch (error) {
    console.error("[Postgres] Failed to get history:", error);
    return [];
  }
}

/**
 * Get total count of positions in Postgres
 */
export async function getPositionCountAsync(): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;

  try {
    const result = await sql`SELECT COUNT(*) as count FROM positions`;
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error("[Postgres] Failed to get count:", error);
    return 0;
  }
}

/**
 * Get positions within a time range
 */
export async function getPositionsByTimeRangeAsync(
  startTime: Date,
  endTime: Date,
  limit: number = 10000
): Promise<SignalKPosition[]> {
  const sql = getDb();
  if (!sql) return [];

  try {
    const rows = await sql`
      SELECT
        latitude, longitude, timestamp, source,
        speed_over_ground as "speedOverGround",
        course_over_ground as "courseOverGround",
        heading, depth,
        apparent_wind_speed as "apparentWindSpeed",
        apparent_wind_angle as "apparentWindAngle",
        water_temperature as "waterTemperature",
        name, mmsi, location,
        segment_index as "segmentIndex"
      FROM positions
      WHERE timestamp >= ${startTime} AND timestamp <= ${endTime}
      ORDER BY timestamp ASC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      timestamp: (row.timestamp as Date).toISOString(),
      source: row.source as string,
      speedOverGround: row.speedOverGround as number | undefined,
      courseOverGround: row.courseOverGround as number | undefined,
      heading: row.heading as number | undefined,
      depth: row.depth as number | undefined,
      apparentWindSpeed: row.apparentWindSpeed as number | undefined,
      apparentWindAngle: row.apparentWindAngle as number | undefined,
      waterTemperature: row.waterTemperature as number | undefined,
      name: row.name as string | undefined,
      mmsi: row.mmsi as string | undefined,
      location: row.location as string | undefined,
      segmentIndex: row.segmentIndex as number | undefined,
    }));
  } catch (error) {
    console.error("[Postgres] Failed to get positions by range:", error);
    return [];
  }
}

/**
 * Migrate positions from Redis to Postgres (one-time migration)
 */
export async function migrateFromRedisAsync(
  positions: SignalKPosition[]
): Promise<{ migrated: number; failed: number }> {
  const sql = getDb();
  if (!sql) return { migrated: 0, failed: positions.length };

  let migrated = 0;
  let failed = 0;

  // Batch insert for efficiency
  const batchSize = 100;
  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize);

    for (const position of batch) {
      const success = await storePositionAsync(position);
      if (success) {
        migrated++;
      } else {
        failed++;
      }
    }

    // Log progress for large migrations
    if (positions.length > 1000 && i % 1000 === 0) {
      console.log(`[Postgres] Migration progress: ${i}/${positions.length}`);
    }
  }

  console.log(`[Postgres] Migration complete: ${migrated} migrated, ${failed} failed`);
  return { migrated, failed };
}

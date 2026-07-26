/**
 * PostgreSQL storage for position history using Neon serverless.
 *
 * Postgres is the durable, unbounded record of every position we have ever
 * seen (live Signal K webhooks and imported GPX tracks alike).  Redis remains
 * the hot path for the current position and a small recent buffer.
 *
 * Inserts are idempotent: a unique index over
 * (timestamp, latitude, longitude, source) plus ON CONFLICT DO NOTHING means
 * replayed webhooks, re-uploaded GPX files and re-run migrations cannot create
 * duplicate rows.
 */

import { neon } from "@neondatabase/serverless";
import type { SignalKPosition } from "./store";

/** Columns written by every insert path, in a fixed order. */
const COLUMNS = [
  "latitude",
  "longitude",
  "altitude",
  "timestamp",
  "timezone",
  "source",
  "speed_over_ground",
  "course_over_ground",
  "heading",
  "trip_log",
  "depth",
  "apparent_wind_speed",
  "apparent_wind_angle",
  "water_temperature",
  "barometric_pressure",
  "name",
  "mmsi",
  "location",
  "segment_index",
  "point_index",
  "import_id",
] as const;

/**
 * Rows per INSERT statement.  Postgres allows 65535 bind parameters; at 19
 * columns this stays well inside that and keeps each request small enough for
 * the serverless HTTP transport.
 */
const INSERT_BATCH_SIZE = 250;

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
 * Reject timestamps Postgres cannot store or that would poison ordering.
 * GPX imports have historically carried synthetic year-9999 sentinels; those
 * must never reach the durable store.
 */
function isUsableTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return false;
  const year = new Date(ms).getUTCFullYear();
  return year >= 1970 && year <= 2200;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Convert a position to a parameter tuple, or null if it is not storable.
 * Uses ?? (not ||) so legitimate zeros — 0 knots at anchor, heading 000,
 * segment 0 — are preserved rather than turned into NULL.
 */
function toRow(position: SignalKPosition): unknown[] | null {
  if (!isFiniteNumber(position.latitude) || !isFiniteNumber(position.longitude)) {
    return null;
  }
  if (Math.abs(position.latitude) > 90 || Math.abs(position.longitude) > 180) {
    return null;
  }
  if (!isUsableTimestamp(position.timestamp)) {
    return null;
  }

  return [
    position.latitude,
    position.longitude,
    position.altitude ?? null,
    position.timestamp,
    position.timezone ?? null,
    position.source ?? "signalk",
    position.speedOverGround ?? null,
    position.courseOverGround ?? null,
    position.heading ?? null,
    position.tripLog ?? null,
    position.depth ?? null,
    position.apparentWindSpeed ?? null,
    position.apparentWindAngle ?? null,
    position.waterTemperature ?? null,
    position.barometricPressure ?? null,
    position.name ?? null,
    position.mmsi ?? null,
    position.location ?? null,
    position.segmentIndex ?? null,
    position.pointIndex ?? null,
    position.importId ?? null,
  ];
}

function buildInsert(rowCount: number): string {
  const tuples: string[] = [];
  let param = 1;
  for (let i = 0; i < rowCount; i++) {
    const placeholders = COLUMNS.map(() => `$${param++}`);
    tuples.push(`(${placeholders.join(", ")})`);
  }
  return `INSERT INTO positions (${COLUMNS.join(", ")}) VALUES ${tuples.join(", ")} ON CONFLICT DO NOTHING`;
}

export type InitResult = {
  ok: boolean;
  uniqueIndexReady: boolean;
  error?: string;
  duplicatesBlockingIndex?: boolean;
};

/**
 * Create the table, bring older deployments up to the current schema, and
 * install the dedup index.  Safe to call repeatedly.
 */
export async function initializePostgres(): Promise<InitResult> {
  const sql = getDb();
  if (!sql) return { ok: false, uniqueIndexReady: false, error: "Postgres not configured" };

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS positions (
        id BIGSERIAL PRIMARY KEY,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        altitude DOUBLE PRECISION,
        timestamp TIMESTAMPTZ NOT NULL,
        timezone TEXT,
        source TEXT NOT NULL DEFAULT 'signalk',
        speed_over_ground DOUBLE PRECISION,
        course_over_ground DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        trip_log DOUBLE PRECISION,
        depth DOUBLE PRECISION,
        apparent_wind_speed DOUBLE PRECISION,
        apparent_wind_angle DOUBLE PRECISION,
        water_temperature DOUBLE PRECISION,
        barometric_pressure DOUBLE PRECISION,
        name TEXT,
        mmsi TEXT,
        location TEXT,
        segment_index INTEGER,
        point_index INTEGER,
        import_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Bring a table created by the first version of this file up to date.
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS altitude DOUBLE PRECISION`;
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS timezone TEXT`;
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS trip_log DOUBLE PRECISION`;
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS barometric_pressure DOUBLE PRECISION`;
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS point_index INTEGER`;
    await sql`ALTER TABLE positions ADD COLUMN IF NOT EXISTS import_id TEXT`;
    await sql`ALTER TABLE positions ALTER COLUMN source SET DEFAULT 'signalk'`;

    await sql`CREATE INDEX IF NOT EXISTS idx_positions_timestamp ON positions(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_positions_source ON positions(source)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_positions_import ON positions(import_id)`;

    // The dedup index cannot be created while duplicates exist.  Report that
    // rather than failing the whole initialisation.
    let uniqueIndexReady = true;
    let duplicatesBlockingIndex = false;
    try {
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_dedup
        ON positions(timestamp, latitude, longitude, source)
      `;
    } catch (error) {
      uniqueIndexReady = false;
      duplicatesBlockingIndex = true;
      console.error("[Postgres] Could not create dedup index (existing duplicates?):", error);
    }

    console.log("[Postgres] Schema ready, dedup index:", uniqueIndexReady);
    return { ok: true, uniqueIndexReady, duplicatesBlockingIndex };
  } catch (error) {
    console.error("[Postgres] Failed to initialize:", error);
    return {
      ok: false,
      uniqueIndexReady: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove duplicate rows so the dedup index can be created.  Keeps the lowest
 * id in each group.
 */
export async function deduplicatePositionsAsync(): Promise<{ removed: number }> {
  const sql = getDb();
  if (!sql) return { removed: 0 };

  const result = await sql`
    DELETE FROM positions a
    USING positions b
    WHERE a.id > b.id
      AND a.timestamp = b.timestamp
      AND a.latitude = b.latitude
      AND a.longitude = b.longitude
      AND a.source = b.source
  `;
  const removed = Array.isArray(result) ? result.length : 0;
  return { removed };
}

/**
 * Store a single position.  Returns false if the write did not happen so the
 * caller can surface the failure instead of silently losing data.
 */
export async function storePositionAsync(position: SignalKPosition): Promise<boolean> {
  const result = await storePositionsBatchAsync([position]);
  return result.attempted > 0 && result.failed === 0;
}

export type BatchResult = {
  /** Rows that passed validation and were sent to Postgres. */
  attempted: number;
  /** Rows rejected locally (bad coordinates or unusable timestamp). */
  skipped: number;
  /** Rows in batches that errored. */
  failed: number;
};

/**
 * Insert many positions using multi-row INSERTs.  One round trip per
 * INSERT_BATCH_SIZE rows rather than one per row.
 */
export async function storePositionsBatchAsync(
  positions: SignalKPosition[]
): Promise<BatchResult> {
  const sql = getDb();
  if (!sql) return { attempted: 0, skipped: positions.length, failed: 0 };

  const rows: unknown[][] = [];
  let skipped = 0;
  for (const position of positions) {
    const row = toRow(position);
    if (row) {
      rows.push(row);
    } else {
      skipped++;
    }
  }

  let attempted = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + INSERT_BATCH_SIZE);
    const text = buildInsert(chunk.length);
    const params = chunk.flat();

    try {
      await sql.query(text, params);
      attempted += chunk.length;
    } catch (error) {
      failed += chunk.length;
      console.error(
        `[Postgres] Batch insert failed (${chunk.length} rows):`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return { attempted, skipped, failed };
}

type PositionRow = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: string | Date;
  timezone: string | null;
  source: string;
  speed_over_ground: number | null;
  course_over_ground: number | null;
  heading: number | null;
  trip_log: number | null;
  depth: number | null;
  apparent_wind_speed: number | null;
  apparent_wind_angle: number | null;
  water_temperature: number | null;
  barometric_pressure: number | null;
  name: string | null;
  mmsi: string | null;
  location: string | null;
  segment_index: number | null;
  point_index: number | null;
  import_id: string | null;
};

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function fromRow(row: PositionRow): SignalKPosition {
  const source: SignalKPosition["source"] =
    row.source === "gpx" || row.source === "fallback" ? row.source : "signalk";

  return {
    latitude: row.latitude,
    longitude: row.longitude,
    altitude: row.altitude ?? undefined,
    timestamp: toIso(row.timestamp),
    timezone: row.timezone ?? undefined,
    source,
    speedOverGround: row.speed_over_ground ?? undefined,
    courseOverGround: row.course_over_ground ?? undefined,
    heading: row.heading ?? undefined,
    tripLog: row.trip_log ?? undefined,
    depth: row.depth ?? undefined,
    apparentWindSpeed: row.apparent_wind_speed ?? undefined,
    apparentWindAngle: row.apparent_wind_angle ?? undefined,
    waterTemperature: row.water_temperature ?? undefined,
    barometricPressure: row.barometric_pressure ?? undefined,
    name: row.name ?? undefined,
    mmsi: row.mmsi ?? undefined,
    location: row.location ?? undefined,
    segmentIndex: row.segment_index ?? undefined,
    pointIndex: row.point_index ?? undefined,
    importId: row.import_id ?? undefined,
  };
}

const SELECT_COLUMNS = COLUMNS.join(", ");

/**
 * Position history, newest first.  Throws on database errors so callers can
 * distinguish "no data" from "storage unavailable".
 */
export async function getPositionHistoryAsync(
  limit: number = 10000,
  offset: number = 0
): Promise<SignalKPosition[]> {
  const sql = getDb();
  if (!sql) return [];

  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM positions ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  )) as PositionRow[];

  return rows.map(fromRow);
}

/** Positions within a time range, oldest first (track rendering order). */
export async function getPositionsByTimeRangeAsync(
  startTime: Date,
  endTime: Date,
  limit: number = 10000
): Promise<SignalKPosition[]> {
  const sql = getDb();
  if (!sql) return [];

  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM positions
     WHERE timestamp >= $1 AND timestamp <= $2
     ORDER BY timestamp ASC
     LIMIT $3`,
    [startTime.toISOString(), endTime.toISOString(), limit]
  )) as PositionRow[];

  return rows.map(fromRow);
}

export async function getPositionCountAsync(): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;

  try {
    const result = (await sql`SELECT COUNT(*)::int AS count FROM positions`) as {
      count: number;
    }[];
    return Number(result[0]?.count ?? 0);
  } catch (error) {
    console.error("[Postgres] Failed to get count:", error);
    return 0;
  }
}

/** Row counts and time span per source — used to verify a migration. */
export async function getPositionStatsAsync(): Promise<{
  total: number;
  bySource: { source: string; count: number; oldest: string | null; newest: string | null }[];
}> {
  const sql = getDb();
  if (!sql) return { total: 0, bySource: [] };

  try {
    const rows = (await sql`
      SELECT source,
             COUNT(*)::int AS count,
             MIN(timestamp) AS oldest,
             MAX(timestamp) AS newest
      FROM positions
      GROUP BY source
      ORDER BY source
    `) as { source: string; count: number; oldest: Date | null; newest: Date | null }[];

    return {
      total: rows.reduce((sum, r) => sum + Number(r.count), 0),
      bySource: rows.map((r) => ({
        source: r.source,
        count: Number(r.count),
        oldest: r.oldest ? toIso(r.oldest) : null,
        newest: r.newest ? toIso(r.newest) : null,
      })),
    };
  } catch (error) {
    console.error("[Postgres] Failed to get stats:", error);
    return { total: 0, bySource: [] };
  }
}

/** Number of positions in a time window. */
export async function countPositionsInRangeAsync(
  since?: Date,
  until?: Date
): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;

  const rows = (await sql.query(
    `SELECT COUNT(*)::int AS count FROM positions
     WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
       AND ($2::timestamptz IS NULL OR timestamp <= $2)`,
    [since ? since.toISOString() : null, until ? until.toISOString() : null]
  )) as { count: number }[];

  return Number(rows[0]?.count ?? 0);
}

/**
 * The rendered track: every stored position in chronological order, evenly
 * thinned in the database when the window holds more points than the map can
 * usefully draw.
 *
 * Thinning happens server-side so a multi-year track never has to cross the
 * wire in full.  Ordering is purely chronological — GPX imports and live
 * Signal K points interleave by when they were recorded, not by which store
 * they came from.
 */
export async function getTrackAsync(options: {
  since?: Date;
  until?: Date;
  maxPoints?: number;
}): Promise<{ points: SignalKPosition[]; total: number; stride: number }> {
  const sql = getDb();
  if (!sql) return { points: [], total: 0, stride: 1 };

  const { since, until, maxPoints = 8000 } = options;
  const total = await countPositionsInRangeAsync(since, until);
  if (total === 0) return { points: [], total: 0, stride: 1 };

  const stride = Math.max(1, Math.ceil(total / maxPoints));
  const sinceParam = since ? since.toISOString() : null;
  const untilParam = until ? until.toISOString() : null;

  let rows: PositionRow[];
  if (stride === 1) {
    rows = (await sql.query(
      `SELECT ${SELECT_COLUMNS} FROM positions
       WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
         AND ($2::timestamptz IS NULL OR timestamp <= $2)
       ORDER BY timestamp ASC`,
      [sinceParam, untilParam]
    )) as PositionRow[];
  } else {
    // Keep every Nth row plus the most recent one, so the drawn line always
    // reaches the vessel's latest recorded position.
    rows = (await sql.query(
      `SELECT ${SELECT_COLUMNS} FROM (
         SELECT ${SELECT_COLUMNS},
                row_number() OVER (ORDER BY timestamp ASC) AS rn
         FROM positions
         WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
           AND ($2::timestamptz IS NULL OR timestamp <= $2)
       ) s
       WHERE s.rn % $3 = 1 OR s.rn = $4
       ORDER BY timestamp ASC`,
      [sinceParam, untilParam, stride, total]
    )) as PositionRow[];
  }

  return { points: rows.map(fromRow), total, stride };
}

export type ImportSummary = {
  importId: string;
  count: number;
  oldest: string | null;
  newest: string | null;
  importedAt: string | null;
};

/** One row per GPX upload, for review and selective removal. */
export async function getImportsAsync(): Promise<ImportSummary[]> {
  const sql = getDb();
  if (!sql) return [];

  const rows = (await sql`
    SELECT import_id,
           COUNT(*)::int AS count,
           MIN(timestamp) AS oldest,
           MAX(timestamp) AS newest,
           MIN(created_at) AS imported_at
    FROM positions
    WHERE import_id IS NOT NULL
    GROUP BY import_id
    ORDER BY MIN(created_at) DESC
  `) as {
    import_id: string;
    count: number;
    oldest: Date | null;
    newest: Date | null;
    imported_at: Date | null;
  }[];

  return rows.map((r) => ({
    importId: r.import_id,
    count: Number(r.count),
    oldest: r.oldest ? toIso(r.oldest) : null,
    newest: r.newest ? toIso(r.newest) : null,
    importedAt: r.imported_at ? toIso(r.imported_at) : null,
  }));
}

/** Undo a single GPX import without touching live data or other imports. */
export async function deleteImportAsync(importId: string): Promise<{ deleted: number }> {
  const sql = getDb();
  if (!sql) return { deleted: 0 };

  const before = await countPositionsInRangeAsync();
  await sql.query(`DELETE FROM positions WHERE import_id = $1`, [importId]);
  const after = await countPositionsInRangeAsync();

  return { deleted: Math.max(0, before - after) };
}

/** Most recent stored position, used as a durable fallback when Redis is empty. */
export async function getLatestStoredPositionAsync(): Promise<SignalKPosition | null> {
  const sql = getDb();
  if (!sql) return null;

  try {
    const rows = (await sql.query(
      `SELECT ${SELECT_COLUMNS} FROM positions ORDER BY timestamp DESC LIMIT 1`,
      []
    )) as PositionRow[];
    return rows.length > 0 ? fromRow(rows[0]) : null;
  } catch (error) {
    console.error("[Postgres] Failed to get latest position:", error);
    return null;
  }
}

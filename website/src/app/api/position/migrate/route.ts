import { NextRequest, NextResponse } from "next/server";
import {
  initializePostgres,
  migrateFromRedisAsync,
  getPositionCountAsync,
  isPostgresConfigured,
} from "../postgres-store";
import { getPositionHistoryAsync } from "../redis-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large migrations

const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/**
 * GET /api/position/migrate
 * Check migration status
 */
export async function GET() {
  const postgresConfigured = isPostgresConfigured();
  let postgresCount = 0;
  let redisCount = 0;

  if (postgresConfigured) {
    postgresCount = await getPositionCountAsync();
  }

  try {
    const redisHistory = await getPositionHistoryAsync(100000);
    redisCount = redisHistory.length;
  } catch {
    redisCount = -1;
  }

  return NextResponse.json({
    postgresConfigured,
    postgresCount,
    redisCount,
    needsMigration: redisCount > postgresCount,
  });
}

/**
 * POST /api/position/migrate
 * Initialize Postgres and migrate data from Redis
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get("authorization");
  const queryToken = request.nextUrl.searchParams.get("token");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : queryToken;

  if (SIGNALK_SECRET && token !== SIGNALK_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Postgres not configured. Set DATABASE_URL or POSTGRES_URL environment variable." },
      { status: 400 }
    );
  }

  try {
    // Initialize tables
    console.log("[Migration] Initializing Postgres tables...");
    const initialized = await initializePostgres();
    if (!initialized) {
      return NextResponse.json(
        { error: "Failed to initialize Postgres tables" },
        { status: 500 }
      );
    }

    // Get existing count to avoid duplicate migration
    const existingCount = await getPositionCountAsync();
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: "Postgres already has data, skipping migration",
        existingCount,
      });
    }

    // Get all positions from Redis
    console.log("[Migration] Fetching positions from Redis...");
    const positions = await getPositionHistoryAsync(100000); // Get up to 100K
    console.log(`[Migration] Found ${positions.length} positions in Redis`);

    if (positions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No positions to migrate",
        migrated: 0,
      });
    }

    // Migrate to Postgres
    console.log("[Migration] Migrating to Postgres...");
    const result = await migrateFromRedisAsync(positions);

    return NextResponse.json({
      success: true,
      message: `Migration complete`,
      ...result,
      totalInRedis: positions.length,
    });
  } catch (error) {
    console.error("[Migration] Error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

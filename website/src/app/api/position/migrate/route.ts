import { NextRequest, NextResponse } from "next/server";
import {
  initializePostgres,
  storePositionsBatchAsync,
  getPositionCountAsync,
  getPositionStatsAsync,
  deduplicatePositionsAsync,
  isPostgresConfigured,
} from "../postgres-store";
import {
  getStoreLengthsAsync,
  getListRangeAsync,
  isPostgresMigrationCompleteAsync,
  setPostgresMigrationCompleteAsync,
} from "../redis-store";
import { requireAuth } from "../auth";

export const dynamic = "force-dynamic";
// Kept within the Hobby-plan ceiling; the endpoint is resumable, so a large
// backlog is migrated across however many calls it takes.
export const maxDuration = 60;

/** Stop work and return progress before the platform kills the function. */
const TIME_BUDGET_MS = 45_000;
/** Positions pulled from Redis per LRANGE. */
const READ_CHUNK = 2000;

/**
 * Fail closed: without a configured secret this endpoint can read and rewrite
 * the entire position history, so it must not be publicly callable.
 * Shared with the other position endpoints so there is one implementation.
 */
const authorize = requireAuth;

/**
 * GET /api/position/migrate
 * Migration status: what is in Redis, what is in Postgres, is trimming enabled.
 */
export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  const postgresConfigured = isPostgresConfigured();

  let redisLengths = { history: -1, permanentTrack: -1 };
  try {
    redisLengths = await getStoreLengthsAsync();
  } catch (error) {
    console.error("[Migration] Failed to read Redis lengths:", error);
  }

  const stats = postgresConfigured
    ? await getPositionStatsAsync()
    : { total: 0, bySource: [] };

  const migrationComplete = await isPostgresMigrationCompleteAsync();

  return NextResponse.json({
    postgresConfigured,
    redis: redisLengths,
    postgres: stats,
    migrationComplete,
    redisTrimmingEnabled: migrationComplete,
    note: migrationComplete
      ? "Postgres holds the backlog; Redis history is trimmed to a rolling buffer."
      : "Redis retains full history until migration completes. Trimming is disabled.",
  });
}

type ListName = "history" | "permanentTrack";

type ListProgress = {
  total: number;
  startOffset: number;
  processed: number;
  nextOffset: number;
  inserted: number;
  skipped: number;
  failed: number;
  done: boolean;
};

async function migrateList(
  list: ListName,
  startOffset: number,
  deadline: number
): Promise<ListProgress> {
  const lengths = await getStoreLengthsAsync();
  const total = list === "history" ? lengths.history : lengths.permanentTrack;

  const progress: ListProgress = {
    total,
    startOffset,
    processed: 0,
    nextOffset: startOffset,
    inserted: 0,
    skipped: 0,
    failed: 0,
    done: startOffset >= total,
  };

  let offset = startOffset;
  while (offset < total) {
    if (Date.now() > deadline) {
      progress.done = false;
      return progress;
    }

    const stop = Math.min(offset + READ_CHUNK, total) - 1;
    const batch = await getListRangeAsync(list, offset, stop);
    if (batch.length === 0) break;

    const result = await storePositionsBatchAsync(batch);
    progress.inserted += result.attempted;
    progress.skipped += result.skipped;
    progress.failed += result.failed;
    progress.processed += batch.length;

    offset += batch.length;
    progress.nextOffset = offset;
  }

  progress.nextOffset = offset;
  progress.done = offset >= total;
  return progress;
}

/**
 * POST /api/position/migrate
 *
 * Copies both Redis lists into Postgres in batches.  Idempotent (duplicate
 * rows are rejected by the dedup index), resumable via the returned offsets,
 * and only enables Redis trimming once a full pass completes cleanly.
 *
 * Query params:
 *   historyOffset, trackOffset — resume points (default 0)
 *   finalize=false             — migrate but do not enable trimming
 *   dedupe=true                — remove duplicate rows first (needed only if
 *                                the unique index could not be created)
 */
export async function POST(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Postgres not configured. Set DATABASE_URL or POSTGRES_URL." },
      { status: 400 }
    );
  }

  const params = request.nextUrl.searchParams;
  const historyOffset = Math.max(0, parseInt(params.get("historyOffset") || "0", 10) || 0);
  const trackOffset = Math.max(0, parseInt(params.get("trackOffset") || "0", 10) || 0);
  const finalize = params.get("finalize") !== "false";
  const shouldDedupe = params.get("dedupe") === "true";

  const deadline = Date.now() + TIME_BUDGET_MS;

  try {
    const init = await initializePostgres();
    if (!init.ok) {
      return NextResponse.json(
        { error: "Failed to initialize Postgres schema", details: init.error },
        { status: 500 }
      );
    }

    let deduped: { removed: number } | undefined;
    if (shouldDedupe) {
      deduped = await deduplicatePositionsAsync();
      // Retry index creation now that duplicates are gone.
      await initializePostgres();
    }

    const before = await getPositionCountAsync();

    // Permanent track first: it holds GPX imports and the long-range track,
    // the data with no other copy anywhere.
    const track = await migrateList("permanentTrack", trackOffset, deadline);
    const history = await migrateList("history", historyOffset, deadline);

    const after = await getPositionCountAsync();
    const allDone = track.done && history.done;
    const clean = track.failed === 0 && history.failed === 0;

    let migrationFlagSet = await isPostgresMigrationCompleteAsync();
    if (allDone && clean && finalize && !migrationFlagSet) {
      await setPostgresMigrationCompleteAsync({
        rowsInPostgres: after,
        historyMigrated: history.inserted,
        trackMigrated: track.inserted,
      });
      migrationFlagSet = true;
    }

    const nextCall = allDone
      ? null
      : `POST /api/position/migrate?historyOffset=${history.nextOffset}&trackOffset=${track.nextOffset}`;

    return NextResponse.json({
      success: true,
      done: allDone,
      lists: { permanentTrack: track, history },
      postgresRows: { before, after, added: after - before },
      dedupeIndexReady: init.uniqueIndexReady,
      deduped,
      migrationFlagSet,
      redisTrimmingEnabled: migrationFlagSet,
      nextCall,
      message: allDone
        ? clean
          ? "Migration complete. Redis trimming is now enabled."
          : "All records processed but some batches failed — trimming left disabled."
        : "Time budget reached. Call again with the offsets in nextCall to continue.",
    });
  } catch (error) {
    console.error("[Migration] Error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

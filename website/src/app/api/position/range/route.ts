import { NextRequest, NextResponse } from "next/server";
import {
  deleteRangeAsync,
  describeRangeAsync,
  isPostgresConfigured,
} from "../postgres-store";
import { requireAuth } from "../auth";

export const dynamic = "force-dynamic";

const CONFIRM_PHRASE = "DELETE-RANGE";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/position/range?since=&until=
 * Reports what a delete over this window would remove. Changes nothing.
 */
export async function GET(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const since = parseDate(request.nextUrl.searchParams.get("since"));
  const until = parseDate(request.nextUrl.searchParams.get("until"));
  if (!since || !until) {
    return NextResponse.json(
      { error: "since and until are required ISO timestamps" },
      { status: 400 }
    );
  }

  const summary = await describeRangeAsync(since, until);
  return NextResponse.json({
    dryRun: true,
    since: since.toISOString(),
    until: until.toISOString(),
    wouldDelete: summary.count,
    bySource: summary.bySource,
    message:
      `This would permanently delete ${summary.count} positions. ` +
      `Take an export first: GET /api/position/export?format=gpx`,
  });
}

/**
 * DELETE /api/position/range?since=&until=&confirm=DELETE-RANGE
 *
 * Removes every position in the window. There is no undo — the rows are gone
 * from Postgres, and Redis holds at most a recent buffer, so an export taken
 * beforehand is the only way back.
 */
export async function DELETE(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Postgres is not configured" }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const since = parseDate(params.get("since"));
  const until = parseDate(params.get("until"));

  if (!since || !until) {
    return NextResponse.json(
      { error: "since and until are required ISO timestamps" },
      { status: 400 }
    );
  }
  if (until <= since) {
    return NextResponse.json({ error: "until must be after since" }, { status: 400 });
  }

  // Deliberately awkward: this is the one operation with no way back.
  if (params.get("confirm") !== CONFIRM_PHRASE) {
    const summary = await describeRangeAsync(since, until);
    return NextResponse.json(
      {
        error: "Confirmation required",
        wouldDelete: summary.count,
        bySource: summary.bySource,
        message:
          `Repeat with confirm=${CONFIRM_PHRASE} to delete ${summary.count} positions. ` +
          `Export first if you have not: GET /api/position/export?format=gpx`,
      },
      { status: 400 }
    );
  }

  try {
    const { deleted } = await deleteRangeAsync(since, until);
    console.warn(
      `[Range] Deleted ${deleted} positions between ${since.toISOString()} and ${until.toISOString()}`
    );
    return NextResponse.json({
      success: true,
      deleted,
      since: since.toISOString(),
      until: until.toISOString(),
    });
  } catch (error) {
    console.error("[Range] Delete failed:", error);
    return NextResponse.json(
      { error: "Delete failed", details: String(error) },
      { status: 500 }
    );
  }
}

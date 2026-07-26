import { NextRequest, NextResponse } from "next/server";
import { importTrackFromGPX } from "../redis-store";
import { parseGPX, type GPXTrackPoint } from "@/lib/gpx-parser";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

// Allow longer execution time for large GPX files (60 seconds)
export const maxDuration = 60;

// Secret token to authenticate track management
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/** Default spacing applied to untimed points when no end time is supplied. */
const DEFAULT_POINT_SPACING_MS = 60_000;

/** A track point that is ready to store: its timestamp is known and real. */
type TimedPoint = Omit<GPXTrackPoint, "timestamp"> & { timestamp: string };

function fileOrder(a: GPXTrackPoint, b: GPXTrackPoint): number {
  const segA = a.segmentIndex ?? 0;
  const segB = b.segmentIndex ?? 0;
  if (segA !== segB) return segA - segB;
  return a.pointIndex - b.pointIndex;
}

/**
 * Give every point a real timestamp, or explain why we cannot.
 *
 * GPX files exported by some chartplotters carry no <time> elements at all.
 * This used to be papered over by stamping such points with `Date.now()` —
 * which silently dated an old voyage to the moment of upload — or with
 * year-9999 sentinels. Neither is recoverable once written, so an untimed file
 * is now refused until the caller says when the track was actually sailed.
 */
function resolveTimestamps(
  points: GPXTrackPoint[],
  window: { startTime?: string; endTime?: string }
):
  | { ok: true; points: TimedPoint[]; interpolated: number }
  | { ok: false; error: string; message: string; untimedCount: number } {
  const untimed = points.filter((p) => !p.timestamp);

  if (untimed.length === 0) {
    return { ok: true, points: points as TimedPoint[], interpolated: 0 };
  }

  const start = window.startTime ? new Date(window.startTime) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return {
      ok: false,
      error: "Start time required",
      message:
        `${untimed.length} of ${points.length} points carry no timestamp. ` +
        `Supply 'startTime' (ISO 8601, when the track begins) and optionally ` +
        `'endTime' so these points can be placed on the timeline. Without it ` +
        `they cannot be merged with live tracking data.`,
      untimedCount: untimed.length,
    };
  }

  const end = window.endTime ? new Date(window.endTime) : null;
  if (end && Number.isNaN(end.getTime())) {
    return {
      ok: false,
      error: "Invalid end time",
      message: "'endTime' is not a valid ISO 8601 timestamp",
      untimedCount: untimed.length,
    };
  }
  if (end && end.getTime() <= start.getTime()) {
    return {
      ok: false,
      error: "Invalid time window",
      message: "'endTime' must be after 'startTime'",
      untimedCount: untimed.length,
    };
  }

  // Space the untimed points evenly across the supplied window, in file order.
  const ordered = [...untimed].sort(fileOrder);
  const spanMs = end
    ? end.getTime() - start.getTime()
    : Math.max(0, ordered.length - 1) * DEFAULT_POINT_SPACING_MS;
  const step = ordered.length > 1 ? spanMs / (ordered.length - 1) : 0;

  const assigned = new Map<GPXTrackPoint, string>();
  ordered.forEach((point, i) => {
    assigned.set(point, new Date(start.getTime() + step * i).toISOString());
  });

  return {
    ok: true,
    points: points.map((p) => ({
      ...p,
      timestamp: p.timestamp ?? assigned.get(p)!,
    })),
    interpolated: ordered.length,
  };
}

/** Stable, human-readable import id so uploads can be identified and undone. */
function makeImportId(filename: string | undefined): string {
  const slug = (filename ?? "upload")
    .replace(/\.gpx$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .toLowerCase();
  return `${new Date().toISOString().replace(/[:.]/g, "-")}_${slug || "upload"}`;
}

/**
 * POST /api/position/import-gpx
 *
 * Imports track points from a GPX file or pre-parsed track points.
 *
 * Accepts:
 * - application/json with "points" array (recommended for large files - parse GPX client-side)
 * - application/json with "gpx" field containing GPX string
 * - multipart/form-data with file field "gpx"
 * - application/xml or text/xml with GPX content in body
 *
 * Optional fields, required only when the file has untimed points:
 * - startTime  ISO 8601, when the track begins
 * - endTime    ISO 8601, when it ends (defaults to one minute per point)
 */
export async function POST(request: NextRequest) {
  // Fail closed: without a configured secret this endpoint would accept
  // anonymous writes to the durable track store.
  if (!SIGNALK_SECRET) {
    return NextResponse.json(
      {
        error: "Import disabled",
        message: "SIGNALK_WEBHOOK_SECRET is not configured on the server",
      },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");
  const queryToken = request.nextUrl.searchParams.get("token");

  let token: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (xApiKey) {
    token = xApiKey;
  } else if (queryToken) {
    token = queryToken;
  }

  if (token !== SIGNALK_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing authentication token" },
      { status: 401 }
    );
  }

  try {
    let trackPoints: GPXTrackPoint[];
    let filename: string | undefined;
    let startTime: string | undefined;
    let endTime: string | undefined;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await request.json();
      startTime = json.startTime;
      endTime = json.endTime;
      filename = json.filename;

      if (json.points && Array.isArray(json.points)) {
        // Pre-parsed track points from client-side GPX parsing.
        trackPoints = json.points
          .map(
            (
              p: {
                latitude?: number;
                lat?: number;
                longitude?: number;
                lng?: number;
                lon?: number;
                timestamp?: string | null;
                name?: string;
                segmentIndex?: number;
                pointIndex?: number;
              },
              i: number
            ) => ({
              latitude: p.latitude ?? p.lat,
              longitude: p.longitude ?? p.lng ?? p.lon,
              // Absent times stay absent — they are resolved below, not invented.
              timestamp: p.timestamp || null,
              name: p.name,
              segmentIndex: p.segmentIndex,
              pointIndex: p.pointIndex ?? i,
            })
          )
          .filter(
            (p: GPXTrackPoint) =>
              typeof p.latitude === "number" &&
              typeof p.longitude === "number" &&
              !isNaN(p.latitude) &&
              !isNaN(p.longitude)
          );

        if (trackPoints.length === 0) {
          return NextResponse.json(
            { error: "No valid track points", message: "Points array contained no valid coordinates" },
            { status: 400 }
          );
        }
      } else if (json.gpx || json.content) {
        trackPoints = parseGPX(json.gpx || json.content).points;
      } else {
        return NextResponse.json(
          { error: "Invalid JSON format", message: "Send either 'points' array or 'gpx' string" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("gpx") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No GPX file provided", message: "Upload a file with field name 'gpx'" },
          { status: 400 }
        );
      }

      filename = file.name;
      startTime = (formData.get("startTime") as string) || undefined;
      endTime = (formData.get("endTime") as string) || undefined;
      trackPoints = parseGPX(await file.text()).points;
    } else if (contentType.includes("xml") || contentType.includes("text/plain")) {
      startTime = request.nextUrl.searchParams.get("startTime") ?? undefined;
      endTime = request.nextUrl.searchParams.get("endTime") ?? undefined;
      trackPoints = parseGPX(await request.text()).points;
    } else {
      return NextResponse.json(
        {
          error: "Invalid content type",
          message: "Send as JSON with 'points' array (recommended), multipart/form-data, or XML",
        },
        { status: 400 }
      );
    }

    if (trackPoints.length === 0) {
      return NextResponse.json(
        {
          error: "No track points found",
          message: "GPX file contains no waypoints, track points, or route points",
        },
        { status: 400 }
      );
    }

    const resolved = resolveTimestamps(trackPoints, { startTime, endTime });
    if (!resolved.ok) {
      return NextResponse.json(
        {
          error: resolved.error,
          message: resolved.message,
          untimedCount: resolved.untimedCount,
          totalPoints: trackPoints.length,
        },
        { status: 400 }
      );
    }

    const importId = makeImportId(filename);
    const result = await importTrackFromGPX(resolved.points, { importId });

    // An import that reached no durable store is a failure, not a success —
    // reporting it as success is how previous imports were lost unnoticed.
    if (!result.durable) {
      return NextResponse.json(
        {
          success: false,
          error: "Import not durable",
          message:
            "Points could not be written to the durable store. Nothing has been " +
            "permanently recorded; check DATABASE_URL and retry.",
          importId,
          failed: result.failed,
          total: result.total,
        },
        { status: 503 }
      );
    }

    const sorted = [...resolved.points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      message:
        `Imported ${result.imported} of ${result.total} points` +
        (result.skipped > 0 ? `, ${result.skipped} already present` : "") +
        (resolved.interpolated > 0
          ? `. ${resolved.interpolated} points had no timestamp and were spaced across the window you supplied`
          : ""),
      importId,
      imported: result.imported,
      skipped: result.skipped,
      total: result.total,
      interpolated: resolved.interpolated,
      durable: result.durable,
      firstPoint: sorted[0],
      lastPoint: sorted[sorted.length - 1],
    });
  } catch (error) {
    console.error("[Import GPX] Error:", error);
    return NextResponse.json(
      { error: "Failed to import GPX", details: String(error) },
      { status: 500 }
    );
  }
}

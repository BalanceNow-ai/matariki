import { NextRequest, NextResponse } from "next/server";
import { getTrackAsync, isPostgresConfigured } from "../postgres-store";
import { getPermanentTrackAsync } from "../redis-store";
import type { SignalKPosition } from "../store";
import { requireAuth } from "../auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Upper bound on a single export. Large enough for years of track, small
 * enough that the response is still assembled inside the function timeout.
 */
const MAX_EXPORT_POINTS = 200_000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render the track as GPX.
 *
 * Points are grouped into segments so that a gap in the record is drawn as a
 * gap rather than as a straight line across it.
 */
function toGpx(points: SignalKPosition[], gapMs: number): string {
  const segments: SignalKPosition[][] = [];
  let current: SignalKPosition[] = [];

  for (const p of points) {
    if (current.length > 0) {
      const gap =
        new Date(p.timestamp).getTime() -
        new Date(current[current.length - 1].timestamp).getTime();
      if (gap > gapMs) {
        segments.push(current);
        current = [];
      }
    }
    current.push(p);
  }
  if (current.length > 0) segments.push(current);

  const body = segments
    .map((segment) => {
      const pts = segment
        .map(
          (p) =>
            `      <trkpt lat="${p.latitude}" lon="${p.longitude}">\n` +
            `        <time>${escapeXml(new Date(p.timestamp).toISOString())}</time>\n` +
            (p.speedOverGround !== undefined && p.speedOverGround !== null
              ? `        <extensions><speed>${p.speedOverGround}</speed></extensions>\n`
              : "") +
            `      </trkpt>`
        )
        .join("\n");
      return `    <trkseg>\n${pts}\n    </trkseg>`;
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="matarikiyacht.com" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `  <metadata>\n` +
    `    <name>Matariki III track</name>\n` +
    `    <time>${new Date().toISOString()}</time>\n` +
    `  </metadata>\n` +
    `  <trk>\n    <name>Matariki III</name>\n${body}\n  </trk>\n` +
    `</gpx>\n`
  );
}

function toGeoJson(points: SignalKPosition[]) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Matariki III",
          exported: new Date().toISOString(),
          pointCount: points.length,
        },
        geometry: {
          type: "LineString",
          coordinates: points.map((p) => [p.longitude, p.latitude]),
        },
      },
    ],
  };
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * GET /api/position/export
 *
 * Downloads the stored track. The site had no way to take a copy of its own
 * data, which is why the track already lost is unrecoverable.
 *
 * Query params:
 *   format  "gpx" (default) or "geojson"
 *   since / until  ISO timestamps bounding the export
 *   limit   maximum points (default 200000)
 *   gap     minutes between points that starts a new segment (default 60)
 */
export async function GET(request: NextRequest) {
  // The export is a complete copy of the vessel's movement history, so it is
  // treated like the other operational endpoints rather than left public.
  const denied = requireAuth(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const format = (params.get("format") || "gpx").toLowerCase();
  const since = parseDate(params.get("since"));
  const until = parseDate(params.get("until"));
  const gapMinutes = parseInt(params.get("gap") || "60", 10);
  const gapMs = (Number.isFinite(gapMinutes) ? gapMinutes : 60) * 60_000;

  const limitParam = parseInt(params.get("limit") || "", 10);
  const maxPoints = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, MAX_EXPORT_POINTS)
    : MAX_EXPORT_POINTS;

  let points: SignalKPosition[];
  let source: string;

  try {
    if (isPostgresConfigured()) {
      const result = await getTrackAsync({ since, until, maxPoints });
      points = result.points;
      source = "postgres";
    } else {
      points = (await getPermanentTrackAsync()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      source = "redis";
    }
  } catch (error) {
    console.error("[Export] Failed to read track:", error);
    return NextResponse.json(
      { error: "Could not read the track for export" },
      { status: 503 }
    );
  }

  if (points.length === 0) {
    return NextResponse.json(
      { error: "No track points found for the requested range", source },
      { status: 404 }
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "geojson") {
    return NextResponse.json(toGeoJson(points), {
      headers: {
        "Content-Disposition": `attachment; filename="matariki-track-${stamp}.geojson"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(toGpx(points, gapMs), {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="matariki-track-${stamp}.gpx"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { importTrackFromGPX } from "../redis-store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

// Allow longer execution time for large GPX files (60 seconds)
export const maxDuration = 60;

// Secret token to authenticate track management
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

type GPXTrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
  name?: string;
};

/**
 * Parse GPX XML content to extract track points and waypoints
 */
function parseGPX(gpxContent: string): GPXTrackPoint[] {
  const points: GPXTrackPoint[] = [];

  // Parse waypoints (<wpt lat="..." lon="...">)
  const wptRegex = /<wpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wpt>/gi;
  let wptMatch;
  while ((wptMatch = wptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(wptMatch[1]);
    const lon = parseFloat(wptMatch[2]);
    const innerContent = wptMatch[3];

    // Extract name if present
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    // Extract time if present
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ latitude: lat, longitude: lon, timestamp, name });
    }
  }

  // Parse track points (<trkpt lat="..." lon="...">)
  const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
  let trkptMatch;
  while ((trkptMatch = trkptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(trkptMatch[1]);
    const lon = parseFloat(trkptMatch[2]);
    const innerContent = trkptMatch[3];

    // Extract time if present
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    // Extract name if present
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ latitude: lat, longitude: lon, timestamp, name });
    }
  }

  // Parse route points (<rtept lat="..." lon="...">)
  const rteptRegex = /<rtept\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/rtept>/gi;
  let rteptMatch;
  while ((rteptMatch = rteptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(rteptMatch[1]);
    const lon = parseFloat(rteptMatch[2]);
    const innerContent = rteptMatch[3];

    // Extract time if present
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    // Extract name if present
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ latitude: lat, longitude: lon, timestamp, name });
    }
  }

  // Sort by timestamp
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return points;
}

/**
 * POST /api/position/import-gpx
 * Imports track points from a GPX file or pre-parsed track points
 * Accepts:
 * - multipart/form-data with file field "gpx" (for small files)
 * - application/xml or text/xml with GPX content in body (for small files)
 * - application/json with "points" array (recommended for large files - parse GPX client-side)
 * - application/json with "gpx" field containing GPX string (for small files)
 */
export async function POST(request: NextRequest) {
  // Verify secret token
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

  // Check authentication
  if (SIGNALK_SECRET && token !== SIGNALK_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing authentication token" },
      { status: 401 }
    );
  }

  try {
    let trackPoints: GPXTrackPoint[];
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // Handle JSON - either pre-parsed points or GPX string
      const json = await request.json();

      if (json.points && Array.isArray(json.points)) {
        // Pre-parsed track points from client-side GPX parsing
        trackPoints = json.points.map((p: { latitude?: number; lat?: number; longitude?: number; lng?: number; lon?: number; timestamp?: string; name?: string }) => ({
          latitude: p.latitude ?? p.lat,
          longitude: p.longitude ?? p.lng ?? p.lon,
          timestamp: p.timestamp || new Date().toISOString(),
          name: p.name,
        })).filter((p: GPXTrackPoint) =>
          typeof p.latitude === 'number' &&
          typeof p.longitude === 'number' &&
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
        // GPX string in JSON
        const gpxContent = json.gpx || json.content;
        trackPoints = parseGPX(gpxContent);
      } else {
        return NextResponse.json(
          { error: "Invalid JSON format", message: "Send either 'points' array or 'gpx' string" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("gpx") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No GPX file provided", message: "Upload a file with field name 'gpx'" },
          { status: 400 }
        );
      }

      const gpxContent = await file.text();
      trackPoints = parseGPX(gpxContent);
    } else if (contentType.includes("xml") || contentType.includes("text/plain")) {
      // Handle raw XML body
      const gpxContent = await request.text();
      trackPoints = parseGPX(gpxContent);
    } else {
      return NextResponse.json(
        { error: "Invalid content type", message: "Send as JSON with 'points' array (recommended), multipart/form-data, or XML" },
        { status: 400 }
      );
    }

    if (trackPoints.length === 0) {
      return NextResponse.json(
        { error: "No track points found", message: "GPX file contains no waypoints, track points, or route points" },
        { status: 400 }
      );
    }

    // Import to Redis/memory
    const result = await importTrackFromGPX(trackPoints);

    return NextResponse.json({
      success: true,
      message: `Imported ${result.imported} track points from ${result.total} total (every point when gap > 1min, otherwise every 5th)`,
      imported: result.imported,
      total: result.total,
      firstPoint: trackPoints[0],
      lastPoint: trackPoints[trackPoints.length - 1],
    });
  } catch (error) {
    console.error("[Import GPX] Error:", error);
    return NextResponse.json(
      { error: "Failed to import GPX", details: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  isRedisConfigured,
  getPermanentTrackAsync,
  getLatestPositionAsync,
} from "../../redis-store";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";

type DiagnosticResult = {
  status: "pass" | "fail" | "warn";
  message: string;
  detail?: string;
  data?: unknown;
};

type GPXDiagnosticReport = {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, DiagnosticResult>;
  environment: {
    redisConfigured: boolean;
    webhookSecretConfigured: boolean;
    nodeEnv: string;
  };
  trackData: {
    permanentTrackCount: number;
    latestPosition: unknown;
    sampleTrackPoints: unknown[];
  };
};

// Secret token to authenticate track management
const SIGNALK_SECRET = process.env.SIGNALK_WEBHOOK_SECRET;

/**
 * Test GPX parsing with sample content
 */
function testGPXParsing(gpxContent: string): {
  success: boolean;
  points: Array<{ latitude: number; longitude: number; timestamp: string; name?: string }>;
  errors: string[];
  warnings: string[];
  parseDetails: {
    waypointsFound: number;
    trackPointsFound: number;
    routePointsFound: number;
    hasGpxTag: boolean;
    xmlDeclaration: boolean;
  };
} {
  const points: Array<{ latitude: number; longitude: number; timestamp: string; name?: string }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const parseDetails = {
    waypointsFound: 0,
    trackPointsFound: 0,
    routePointsFound: 0,
    hasGpxTag: false,
    xmlDeclaration: false,
  };

  // Check XML declaration
  parseDetails.xmlDeclaration = gpxContent.includes("<?xml");

  // Check for GPX tag
  parseDetails.hasGpxTag = gpxContent.includes("<gpx");
  if (!parseDetails.hasGpxTag) {
    errors.push("No <gpx> tag found in content");
  }

  // Parse waypoints (<wpt lat="..." lon="...">)
  const wptRegex = /<wpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wpt>/gi;
  let wptMatch;
  while ((wptMatch = wptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(wptMatch[1]);
    const lon = parseFloat(wptMatch[2]);
    const innerContent = wptMatch[3];

    parseDetails.waypointsFound++;

    if (isNaN(lat) || isNaN(lon)) {
      warnings.push(`Invalid waypoint coordinates: lat=${wptMatch[1]}, lon=${wptMatch[2]}`);
      continue;
    }

    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    points.push({ latitude: lat, longitude: lon, timestamp, name });
  }

  // Parse track points (<trkpt lat="..." lon="...">)
  const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
  let trkptMatch;
  while ((trkptMatch = trkptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(trkptMatch[1]);
    const lon = parseFloat(trkptMatch[2]);
    const innerContent = trkptMatch[3];

    parseDetails.trackPointsFound++;

    if (isNaN(lat) || isNaN(lon)) {
      warnings.push(`Invalid trackpoint coordinates: lat=${trkptMatch[1]}, lon=${trkptMatch[2]}`);
      continue;
    }

    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    points.push({ latitude: lat, longitude: lon, timestamp, name });
  }

  // Parse route points (<rtept lat="..." lon="...">)
  const rteptRegex = /<rtept\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/rtept>/gi;
  let rteptMatch;
  while ((rteptMatch = rteptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(rteptMatch[1]);
    const lon = parseFloat(rteptMatch[2]);
    const innerContent = rteptMatch[3];

    parseDetails.routePointsFound++;

    if (isNaN(lat) || isNaN(lon)) {
      warnings.push(`Invalid routepoint coordinates: lat=${rteptMatch[1]}, lon=${rteptMatch[2]}`);
      continue;
    }

    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    points.push({ latitude: lat, longitude: lon, timestamp, name });
  }

  // Sort by timestamp
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (points.length === 0 && parseDetails.hasGpxTag) {
    errors.push("GPX file contains no waypoints, track points, or route points");
  }

  return {
    success: errors.length === 0 && points.length > 0,
    points,
    errors,
    warnings,
    parseDetails,
  };
}

/**
 * GET /api/position/import-gpx/diagnostic
 * Returns diagnostic information about GPX import capability
 */
export async function GET() {
  const checks: Record<string, DiagnosticResult> = {};
  let unhealthyCount = 0;
  let warnCount = 0;

  // Check 1: Redis configuration
  const redisConfigured = isRedisConfigured();
  if (redisConfigured) {
    checks.redisConfiguration = {
      status: "pass",
      message: "Redis is configured and connected",
      detail: "Using Upstash Redis for persistent storage",
    };
  } else {
    checks.redisConfiguration = {
      status: "warn",
      message: "Redis not configured - using in-memory storage",
      detail: "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables",
    };
    warnCount++;
  }

  // Check 2: Authentication secret
  if (SIGNALK_SECRET) {
    checks.authConfiguration = {
      status: "pass",
      message: "Authentication secret is configured",
      detail: `Secret length: ${SIGNALK_SECRET.length} characters`,
    };
  } else {
    checks.authConfiguration = {
      status: "warn",
      message: "No authentication secret configured",
      detail: "GPX imports will work without authentication. Set SIGNALK_WEBHOOK_SECRET for production.",
    };
    warnCount++;
  }

  // Check 3: Current track data
  let trackData = {
    permanentTrackCount: 0,
    latestPosition: null as unknown,
    sampleTrackPoints: [] as unknown[],
  };

  try {
    const permanentTrack = await getPermanentTrackAsync();
    const latestPosition = await getLatestPositionAsync();

    trackData = {
      permanentTrackCount: permanentTrack.length,
      latestPosition: latestPosition,
      sampleTrackPoints: permanentTrack.slice(0, 5),
    };

    checks.trackDataAccess = {
      status: "pass",
      message: `Track data accessible (${permanentTrack.length} points in permanent track)`,
      detail: latestPosition
        ? `Latest: ${latestPosition.latitude?.toFixed(4)}, ${latestPosition.longitude?.toFixed(4)}`
        : "No position data",
    };
  } catch (error) {
    checks.trackDataAccess = {
      status: "fail",
      message: "Failed to access track data",
      detail: String(error),
    };
    unhealthyCount++;
  }

  // Check 4: GPX parser test with sample data
  const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <wpt lat="-35.7275" lon="174.3278">
    <name>Test Waypoint</name>
    <time>2026-01-01T12:00:00Z</time>
  </wpt>
  <trk>
    <trkseg>
      <trkpt lat="-35.7280" lon="174.3280">
        <time>2026-01-01T12:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

  const parseResult = testGPXParsing(sampleGPX);
  if (parseResult.success) {
    checks.gpxParser = {
      status: "pass",
      message: "GPX parser is working correctly",
      detail: `Parsed ${parseResult.points.length} points from test data`,
      data: parseResult.parseDetails,
    };
  } else {
    checks.gpxParser = {
      status: "fail",
      message: "GPX parser failed on test data",
      detail: parseResult.errors.join(", "),
    };
    unhealthyCount++;
  }

  // Determine overall status
  let overall: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (unhealthyCount > 0) {
    overall = "unhealthy";
  } else if (warnCount > 0) {
    overall = "degraded";
  }

  const report: GPXDiagnosticReport = {
    timestamp: new Date().toISOString(),
    overall,
    checks,
    environment: {
      redisConfigured,
      webhookSecretConfigured: !!SIGNALK_SECRET,
      nodeEnv: process.env.NODE_ENV || "development",
    },
    trackData,
  };

  return NextResponse.json(report);
}

/**
 * POST /api/position/import-gpx/diagnostic
 * Test GPX parsing without importing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    let gpxContent: string;
    const contentType = request.headers.get("content-type") || "";

    // Parse the request body
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("gpx") as File | null;

      if (!file) {
        return NextResponse.json({
          success: false,
          error: "No GPX file provided",
          message: "Upload a file with field name 'gpx'",
          processingTimeMs: Date.now() - startTime,
        }, { status: 400 });
      }

      gpxContent = await file.text();
    } else if (contentType.includes("xml") || contentType.includes("text/plain")) {
      gpxContent = await request.text();
    } else {
      try {
        const json = await request.json();
        gpxContent = json.gpx || json.content || "";
      } catch {
        return NextResponse.json({
          success: false,
          error: "Invalid content type",
          message: "Send GPX as multipart/form-data, XML, or JSON with 'gpx' field",
          receivedContentType: contentType,
          processingTimeMs: Date.now() - startTime,
        }, { status: 400 });
      }
    }

    // Basic content validation
    const contentLength = gpxContent.length;
    const preview = gpxContent.substring(0, 500);
    const hasXmlDeclaration = gpxContent.includes("<?xml");
    const hasGpxTag = gpxContent.includes("<gpx");
    const hasWaypoints = gpxContent.includes("<wpt");
    const hasTrackPoints = gpxContent.includes("<trkpt");
    const hasRoutePoints = gpxContent.includes("<rtept");

    // Test parsing
    const parseResult = testGPXParsing(gpxContent);

    return NextResponse.json({
      success: parseResult.success,
      processingTimeMs: Date.now() - startTime,
      contentAnalysis: {
        contentLength,
        preview: preview + (contentLength > 500 ? "..." : ""),
        hasXmlDeclaration,
        hasGpxTag,
        hasWaypoints,
        hasTrackPoints,
        hasRoutePoints,
      },
      parseResult: {
        pointsFound: parseResult.points.length,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        parseDetails: parseResult.parseDetails,
        samplePoints: parseResult.points.slice(0, 5),
        firstPoint: parseResult.points[0] || null,
        lastPoint: parseResult.points[parseResult.points.length - 1] || null,
      },
      wouldImport: parseResult.success && parseResult.points.length > 0,
      message: parseResult.success
        ? `Would import ${parseResult.points.length} track points`
        : `Parse failed: ${parseResult.errors.join(", ")}`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to process GPX content",
      details: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

/**
 * Client-side GPX parser utility
 * Parses GPX XML content and extracts track points for upload to the server.
 * This allows large GPX files to be processed on the client side, avoiding
 * Vercel's serverless function payload limits.
 */

export type GPXTrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
  name?: string;
};

export type GPXParseResult = {
  success: boolean;
  points: GPXTrackPoint[];
  errors: string[];
  warnings: string[];
  stats: {
    waypointsFound: number;
    trackPointsFound: number;
    routePointsFound: number;
    totalPoints: number;
  };
};

/**
 * Parse GPX XML content to extract track points, waypoints, and route points
 */
export function parseGPX(gpxContent: string): GPXParseResult {
  const points: GPXTrackPoint[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let waypointsFound = 0;
  let trackPointsFound = 0;
  let routePointsFound = 0;

  // Validate basic GPX structure
  if (!gpxContent.includes("<gpx")) {
    errors.push("No <gpx> tag found - file may not be valid GPX format");
  }

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
      waypointsFound++;
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
      trackPointsFound++;
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
      routePointsFound++;
    }
  }

  // Sort by timestamp
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Add warnings
  if (points.length === 0) {
    if (gpxContent.includes("<trkpt") || gpxContent.includes("<wpt") || gpxContent.includes("<rtept")) {
      warnings.push("GPX contains point elements but none could be parsed - check format");
    } else {
      warnings.push("No waypoints, track points, or route points found in GPX");
    }
  }

  return {
    success: points.length > 0,
    points,
    errors,
    warnings,
    stats: {
      waypointsFound,
      trackPointsFound,
      routePointsFound,
      totalPoints: points.length,
    },
  };
}

/**
 * Read a File object and parse its GPX content
 */
export async function parseGPXFile(file: File): Promise<GPXParseResult> {
  try {
    const content = await file.text();
    return parseGPX(content);
  } catch (error) {
    return {
      success: false,
      points: [],
      errors: [`Failed to read file: ${error instanceof Error ? error.message : String(error)}`],
      warnings: [],
      stats: {
        waypointsFound: 0,
        trackPointsFound: 0,
        routePointsFound: 0,
        totalPoints: 0,
      },
    };
  }
}

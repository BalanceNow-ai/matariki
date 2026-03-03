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
  /** Segment index - points in the same segment form a continuous track */
  segmentIndex?: number;
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
    segmentsFound: number;
    totalPoints: number;
    pointsWithTimestamps: number;
  };
};

/**
 * Extract lat/lon from an element's attributes, handling any attribute order
 */
function extractLatLon(attributeStr: string): { lat: number; lon: number } | null {
  const latMatch = attributeStr.match(/\blat=["']([^"']+)["']/i);
  const lonMatch = attributeStr.match(/\blon=["']([^"']+)["']/i);

  if (!latMatch || !lonMatch) return null;

  const lat = parseFloat(latMatch[1]);
  const lon = parseFloat(lonMatch[1]);

  if (isNaN(lat) || isNaN(lon)) return null;

  // Validate reasonable coordinate ranges
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return { lat, lon };
}

/**
 * Parse GPX XML content to extract track points, waypoints, and route points
 * Properly handles track segments and attribute ordering
 */
export function parseGPX(gpxContent: string): GPXParseResult {
  const points: GPXTrackPoint[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let waypointsFound = 0;
  let trackPointsFound = 0;
  let routePointsFound = 0;
  let segmentsFound = 0;
  let pointsWithTimestamps = 0;

  // Validate basic GPX structure
  if (!gpxContent.includes("<gpx")) {
    errors.push("No <gpx> tag found - file may not be valid GPX format");
  }

  // Parse waypoints (<wpt ...>...</wpt>) - handles any attribute order
  const wptRegex = /<wpt\s+([^>]+)>([\s\S]*?)<\/wpt>/gi;
  let wptMatch;
  while ((wptMatch = wptRegex.exec(gpxContent)) !== null) {
    const coords = extractLatLon(wptMatch[1]);
    if (!coords) continue;

    const innerContent = wptMatch[2];
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);

    const hasTimestamp = !!timeMatch;
    if (hasTimestamp) pointsWithTimestamps++;

    points.push({
      latitude: coords.lat,
      longitude: coords.lon,
      timestamp: timeMatch ? timeMatch[1] : "",
      name: nameMatch ? nameMatch[1] : undefined,
      segmentIndex: -1, // Waypoints are standalone
    });
    waypointsFound++;
  }

  // Parse track segments - this is crucial for proper track rendering
  // Each <trkseg> represents a continuous track segment
  const trksegRegex = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let trksegMatch;
  let segmentIndex = 0;

  while ((trksegMatch = trksegRegex.exec(gpxContent)) !== null) {
    segmentsFound++;
    const segmentContent = trksegMatch[1];

    // Parse track points within this segment
    const trkptRegex = /<trkpt\s+([^>]+)>([\s\S]*?)<\/trkpt>/gi;
    let trkptMatch;
    let pointIndexInSegment = 0;

    while ((trkptMatch = trkptRegex.exec(segmentContent)) !== null) {
      const coords = extractLatLon(trkptMatch[1]);
      if (!coords) continue;

      const innerContent = trkptMatch[2];
      const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
      const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);

      const hasTimestamp = !!timeMatch;
      if (hasTimestamp) pointsWithTimestamps++;

      points.push({
        latitude: coords.lat,
        longitude: coords.lon,
        // Use actual timestamp or generate sequential fake timestamp within segment
        timestamp: timeMatch
          ? timeMatch[1]
          : `1970-01-01T${String(segmentIndex).padStart(2, "0")}:${String(Math.floor(pointIndexInSegment / 60)).padStart(2, "0")}:${String(pointIndexInSegment % 60).padStart(2, "0")}Z`,
        name: nameMatch ? nameMatch[1] : undefined,
        segmentIndex,
      });
      trackPointsFound++;
      pointIndexInSegment++;
    }

    segmentIndex++;
  }

  // If no segments found, try parsing trkpt outside of trkseg (malformed but common)
  if (segmentsFound === 0) {
    const trkptRegex = /<trkpt\s+([^>]+)>([\s\S]*?)<\/trkpt>/gi;
    let trkptMatch;
    let pointIndex = 0;

    while ((trkptMatch = trkptRegex.exec(gpxContent)) !== null) {
      const coords = extractLatLon(trkptMatch[1]);
      if (!coords) continue;

      const innerContent = trkptMatch[2];
      const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
      const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);

      const hasTimestamp = !!timeMatch;
      if (hasTimestamp) pointsWithTimestamps++;

      points.push({
        latitude: coords.lat,
        longitude: coords.lon,
        timestamp: timeMatch
          ? timeMatch[1]
          : `1970-01-01T00:${String(Math.floor(pointIndex / 60)).padStart(2, "0")}:${String(pointIndex % 60).padStart(2, "0")}Z`,
        name: nameMatch ? nameMatch[1] : undefined,
        segmentIndex: 0,
      });
      trackPointsFound++;
      pointIndex++;
    }

    if (trackPointsFound > 0) {
      segmentsFound = 1;
    }
  }

  // Parse route points (<rtept ...>...</rtept>)
  const rteptRegex = /<rtept\s+([^>]+)>([\s\S]*?)<\/rtept>/gi;
  let rteptMatch;
  let routePointIndex = 0;

  while ((rteptMatch = rteptRegex.exec(gpxContent)) !== null) {
    const coords = extractLatLon(rteptMatch[1]);
    if (!coords) continue;

    const innerContent = rteptMatch[2];
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);

    const hasTimestamp = !!timeMatch;
    if (hasTimestamp) pointsWithTimestamps++;

    points.push({
      latitude: coords.lat,
      longitude: coords.lon,
      timestamp: timeMatch
        ? timeMatch[1]
        : `1970-01-02T00:${String(Math.floor(routePointIndex / 60)).padStart(2, "0")}:${String(routePointIndex % 60).padStart(2, "0")}Z`,
      name: nameMatch ? nameMatch[1] : undefined,
      segmentIndex: segmentsFound + routePointIndex, // Separate segment for route
    });
    routePointsFound++;
    routePointIndex++;
  }

  // Sort by segment first, then by timestamp within segment
  // This ensures proper track continuity
  points.sort((a, b) => {
    // First sort by segment
    const segA = a.segmentIndex ?? 0;
    const segB = b.segmentIndex ?? 0;
    if (segA !== segB) return segA - segB;

    // Then by timestamp within segment
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();

    // Handle invalid dates by keeping original order
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;

    return timeA - timeB;
  });

  // Add warnings
  if (points.length === 0) {
    if (gpxContent.includes("<trkpt") || gpxContent.includes("<wpt") || gpxContent.includes("<rtept")) {
      warnings.push("GPX contains point elements but none could be parsed - check format");
    } else {
      warnings.push("No waypoints, track points, or route points found in GPX");
    }
  }

  if (pointsWithTimestamps === 0 && points.length > 0) {
    warnings.push("No timestamps found in GPX - points will be ordered by their position in the file");
  } else if (pointsWithTimestamps < points.length) {
    warnings.push(`Only ${pointsWithTimestamps} of ${points.length} points have timestamps`);
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
      segmentsFound,
      totalPoints: points.length,
      pointsWithTimestamps,
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
        segmentsFound: 0,
        totalPoints: 0,
        pointsWithTimestamps: 0,
      },
    };
  }
}

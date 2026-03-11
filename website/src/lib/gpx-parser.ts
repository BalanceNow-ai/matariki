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
 * Generate a synthetic timestamp for points without real timestamps.
 * Uses a far-future base date (9999-01-01) to avoid conflicts with real timestamps.
 * Encodes segment and point index to maintain order and uniqueness.
 */
function generateSyntheticTimestamp(segmentIndex: number, pointIndex: number): string {
  // Use segment as hours (0-23 supports 24 segments)
  // Use pointIndex encoded in minutes and seconds (supports 3600 points per segment)
  const hours = segmentIndex % 24;
  const minutes = Math.floor(pointIndex / 60) % 60;
  const seconds = pointIndex % 60;
  const millis = Math.floor(pointIndex / 3600); // For overflow beyond 3600 points

  return `9999-01-01T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}Z`;
}

/**
 * Parse track points from segment content, handling both regular and self-closing tags
 * Returns array of parsed points with their segment index
 */
function parseTrackPoints(
  segmentContent: string,
  segmentIndex: number
): { points: GPXTrackPoint[]; pointsWithTimestamps: number } {
  const points: GPXTrackPoint[] = [];
  let pointsWithTimestamps = 0;
  let pointIndexInSegment = 0;

  // Match both forms:
  // 1. Self-closing: <trkpt lat="..." lon="..."/>
  // 2. With content: <trkpt lat="..." lon="...">...</trkpt>
  // Use a unified regex that captures both forms
  const trkptRegex = /<trkpt\s+([^>\/]+)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi;
  let match;

  while ((match = trkptRegex.exec(segmentContent)) !== null) {
    const coords = extractLatLon(match[1]);
    if (!coords) continue;

    // match[2] is the inner content (undefined for self-closing tags)
    const innerContent = match[2] || "";
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);

    const hasTimestamp = !!timeMatch;
    if (hasTimestamp) pointsWithTimestamps++;

    points.push({
      latitude: coords.lat,
      longitude: coords.lon,
      // Use actual timestamp, or generate synthetic for ordering/deduplication
      timestamp: timeMatch
        ? timeMatch[1]
        : generateSyntheticTimestamp(segmentIndex, pointIndexInSegment),
      name: nameMatch ? nameMatch[1] : undefined,
      segmentIndex,
    });
    pointIndexInSegment++;
  }

  return { points, pointsWithTimestamps };
}

/**
 * Parse GPX XML content to extract track points, waypoints, and route points
 * Properly handles track segments, attribute ordering, and self-closing tags
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

    // Parse track points within this segment (handles both regular and self-closing tags)
    const result = parseTrackPoints(segmentContent, segmentIndex);
    points.push(...result.points);
    trackPointsFound += result.points.length;
    pointsWithTimestamps += result.pointsWithTimestamps;

    segmentIndex++;
  }

  // If no segments found, try parsing trkpt outside of trkseg (malformed but common)
  if (segmentsFound === 0) {
    const result = parseTrackPoints(gpxContent, 0);
    points.push(...result.points);
    trackPointsFound += result.points.length;
    pointsWithTimestamps += result.pointsWithTimestamps;

    if (trackPointsFound > 0) {
      segmentsFound = 1;
    }
  }

  // Parse route points (<rtept ...>...</rtept>) - also handle self-closing
  const rteptRegex = /<rtept\s+([^>\/]+)(?:\/>|>([\s\S]*?)<\/rtept>)/gi;
  let rteptMatch;
  let routePointIndex = 0;

  while ((rteptMatch = rteptRegex.exec(gpxContent)) !== null) {
    const coords = extractLatLon(rteptMatch[1]);
    if (!coords) continue;

    const innerContent = rteptMatch[2] || "";
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);

    const hasTimestamp = !!timeMatch;
    if (hasTimestamp) pointsWithTimestamps++;

    points.push({
      latitude: coords.lat,
      longitude: coords.lon,
      timestamp: timeMatch
        ? timeMatch[1]
        : generateSyntheticTimestamp(segmentsFound, routePointIndex),
      name: nameMatch ? nameMatch[1] : undefined,
      segmentIndex: segmentsFound, // All route points in same segment (continuous route)
    });
    routePointsFound++;
    routePointIndex++;
  }

  // Sort by segment first, then by timestamp within segment
  // Points without timestamps stay in their original order within the segment
  points.sort((a, b) => {
    // First sort by segment
    const segA = a.segmentIndex ?? 0;
    const segB = b.segmentIndex ?? 0;
    if (segA !== segB) return segA - segB;

    // Then by timestamp within segment
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : NaN;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : NaN;

    // If both have no timestamp or invalid timestamps, keep original order
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    // Points without timestamps go to the end of their segment
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

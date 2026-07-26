/**
 * Track simplification for map rendering.
 *
 * Keeping every Nth point is the wrong way to thin a track: it takes no notice
 * of shape, so a long straight ocean leg keeps as many points as a tight
 * passage through a fiord, and the points that define a turn are as likely to
 * be discarded as any other. The visible result is a line that cuts corners
 * across headlands and islands.
 *
 * Douglas-Peucker instead drops points that lie close to the line between
 * their neighbours, so straight runs collapse to their endpoints while turns
 * keep the detail that defines them.
 */

export type TrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

const EARTH_RADIUS_M = 6371000;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Project to local metres using an equirectangular approximation.
 *
 * Accurate enough over the span of a single track segment, and far cheaper
 * than a full geodesic distance for the many comparisons this makes.
 */
function project(
  point: { latitude: number; longitude: number },
  cosOriginLat: number
): { x: number; y: number } {
  return {
    x: point.longitude * DEG_TO_RAD * cosOriginLat * EARTH_RADIUS_M,
    y: point.latitude * DEG_TO_RAD * EARTH_RADIUS_M,
  };
}

/** Perpendicular distance, in metres, from a point to the line through a→b. */
function perpendicularDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // Degenerate segment: fall back to straight-line distance from the endpoint.
  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const numerator = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return numerator / Math.hypot(dx, dy);
}

/**
 * Drop points that sit within `tolerance` of the previous kept point.
 *
 * Cheap (single pass) and very effective on real tracking data, where a vessel
 * at anchor or manoeuvring slowly emits a minute of pings from essentially one
 * spot. Running this first keeps those out of Douglas-Peucker, whose cost
 * grows far faster than linearly.
 */
function radialPrePass<T extends { latitude: number; longitude: number }>(
  points: T[],
  tolerance: number
): T[] {
  if (points.length <= 2) return [...points];

  const cosOriginLat = Math.cos(points[0].latitude * DEG_TO_RAD);
  const toleranceSq = tolerance * tolerance;

  const result: T[] = [points[0]];
  let anchor = project(points[0], cosOriginLat);

  for (let i = 1; i < points.length - 1; i++) {
    const current = project(points[i], cosOriginLat);
    const dx = current.x - anchor.x;
    const dy = current.y - anchor.y;
    if (dx * dx + dy * dy > toleranceSq) {
      result.push(points[i]);
      anchor = current;
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Largest run of points handed to Douglas-Peucker at once.
 *
 * Its worst case is quadratic, reached when almost every point is a turn. On a
 * track of a hundred thousand points that is slow enough to time out a
 * request, so the run is processed in bounded windows. Each window boundary
 * forces one extra kept point, which is invisible at map scale.
 */
const MAX_DP_WINDOW = 2000;

/**
 * Douglas-Peucker, iterative rather than recursive.
 *
 * A track can run to hundreds of thousands of points, and the recursive form
 * would exhaust the stack on a long, nearly straight passage.
 */
function douglasPeucker<T extends { latitude: number; longitude: number }>(
  points: T[],
  toleranceMetres: number
): T[] {
  if (points.length <= 2 || toleranceMetres <= 0) return [...points];

  const cosOriginLat = Math.cos(points[0].latitude * DEG_TO_RAD);
  const projected = points.map((p) => project(p, cosOriginLat));

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last <= first + 1) continue;

    let maxDistance = 0;
    let index = -1;

    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(
        projected[i],
        projected[first],
        projected[last]
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (index !== -1 && maxDistance > toleranceMetres) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  const result: T[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) result.push(points[i]);
  }
  return result;
}

/**
 * Simplify a run of points: radial pre-pass, then Douglas-Peucker over
 * bounded windows so a convoluted track cannot make this quadratic.
 */
export function simplifyTrack<T extends { latitude: number; longitude: number }>(
  points: T[],
  toleranceMetres: number
): T[] {
  if (points.length <= 2 || toleranceMetres <= 0) return [...points];

  const thinned = radialPrePass(points, toleranceMetres);
  if (thinned.length <= MAX_DP_WINDOW) {
    return douglasPeucker(thinned, toleranceMetres);
  }

  const result: T[] = [];
  for (let start = 0; start < thinned.length - 1; start += MAX_DP_WINDOW) {
    const end = Math.min(start + MAX_DP_WINDOW, thinned.length - 1);
    const window = douglasPeucker(thinned.slice(start, end + 1), toleranceMetres);
    // Drop the first point of each window after the first: it is the previous
    // window's last point.
    result.push(...(start === 0 ? window : window.slice(1)));
  }
  return result;
}

/**
 * Break a track wherever it jumps in time.
 *
 * A gap means the vessel was not recorded in between — a passage with the
 * logger off, or the boundary between two voyages. Simplifying across such a
 * gap would let the straight line spanning it dominate the geometry and
 * swallow real detail on both sides, and rendering it as one continuous line
 * draws a course that was never sailed.
 */
export function splitOnTimeGaps<T extends { timestamp: string }>(
  points: T[],
  maxGapMs: number
): T[][] {
  if (points.length === 0) return [];

  const segments: T[][] = [];
  let current: T[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const previous = new Date(points[i - 1].timestamp).getTime();
    const next = new Date(points[i].timestamp).getTime();
    const gap = next - previous;

    if (Number.isFinite(gap) && gap > maxGapMs) {
      segments.push(current);
      current = [];
    }
    current.push(points[i]);
  }

  if (current.length > 0) segments.push(current);
  return segments;
}

/**
 * Simplify a whole track, segment by segment, to roughly a target size.
 *
 * The tolerance is raised and the track re-simplified if the first pass still
 * exceeds the budget, so an unexpectedly dense track degrades gracefully
 * rather than blowing the response size.
 */
export function simplifyTrackToBudget<
  T extends { latitude: number; longitude: number; timestamp: string },
>(
  points: T[],
  options: { toleranceMetres: number; maxPoints: number; maxGapMs: number }
): { points: T[]; toleranceUsed: number; segments: number } {
  const { maxPoints, maxGapMs } = options;
  let tolerance = options.toleranceMetres;

  const segments = splitOnTimeGaps(points, maxGapMs);

  // Each retry re-simplifies the previous (already smaller) result rather than
  // the full track, so widening the tolerance stays cheap.
  let working = segments;
  let simplified = working.flatMap((segment) => simplifyTrack(segment, tolerance));

  for (let attempt = 0; attempt < 12 && simplified.length > maxPoints; attempt++) {
    tolerance *= 2;
    working = working.map((segment) => simplifyTrack(segment, tolerance));
    simplified = working.flat();
  }

  return {
    points: simplified.length > maxPoints ? simplified.slice(0, maxPoints) : simplified,
    toleranceUsed: tolerance,
    segments: segments.length,
  };
}

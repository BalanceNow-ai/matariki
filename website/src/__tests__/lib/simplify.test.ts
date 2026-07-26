import { describe, it, expect } from 'vitest'
import {
  simplifyTrack,
  splitOnGaps,
  simplifyTrackToBudget,
} from '@/lib/simplify'

const t = (n: number) => new Date(Date.UTC(2026, 2, 1, 0, n)).toISOString()

/** A straight run of points along a line of longitude. */
function straightLine(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    latitude: -45.0,
    longitude: 166.0 + i * 0.001,
    timestamp: t(i),
  }))
}

describe('simplifyTrack', () => {
  it('collapses a straight run to its endpoints', () => {
    const result = simplifyTrack(straightLine(50), 12)
    expect(result).toHaveLength(2)
  })

  it('keeps the points that define a turn', () => {
    // A right-angle dogleg: the corner carries the shape and must survive.
    const points = [
      { latitude: -45.0, longitude: 166.0, timestamp: t(0) },
      { latitude: -45.0, longitude: 166.05, timestamp: t(1) },
      { latitude: -45.05, longitude: 166.05, timestamp: t(2) },
    ]
    const result = simplifyTrack(points, 12)
    expect(result).toHaveLength(3)
    expect(result[1].longitude).toBeCloseTo(166.05, 5)
  })

  // The failure that put the drawn line across land: a deviation around a
  // headland must not be flattened into the chord that skips it.
  it('preserves a detour larger than the tolerance', () => {
    const points = [
      { latitude: -45.0, longitude: 166.0, timestamp: t(0) },
      { latitude: -45.01, longitude: 166.005, timestamp: t(1) }, // ~1.1km off the chord
      { latitude: -45.0, longitude: 166.01, timestamp: t(2) },
    ]
    expect(simplifyTrack(points, 12)).toHaveLength(3)
  })

  it('drops a deviation smaller than the tolerance', () => {
    const points = [
      { latitude: -45.0, longitude: 166.0, timestamp: t(0) },
      { latitude: -45.00002, longitude: 166.005, timestamp: t(1) }, // ~2m off
      { latitude: -45.0, longitude: 166.01, timestamp: t(2) },
    ]
    expect(simplifyTrack(points, 12)).toHaveLength(2)
  })

  it('always keeps the first and last point', () => {
    const points = straightLine(100)
    const result = simplifyTrack(points, 12)
    expect(result[0]).toEqual(points[0])
    expect(result[result.length - 1]).toEqual(points[points.length - 1])
  })

  it('returns short tracks untouched', () => {
    expect(simplifyTrack(straightLine(2), 12)).toHaveLength(2)
    expect(simplifyTrack([], 12)).toHaveLength(0)
  })

  // The recursive form would blow the stack on a long, nearly straight leg.
  it('handles a very long track without recursing', () => {
    const result = simplifyTrack(straightLine(200_000), 12)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })
})

describe('splitOnGaps', () => {
  const rule = { maxGapMs: 18 * 3600_000, maxImpliedKnots: 20 }

  it('splits where the record jumps', () => {
    const points = [
      { latitude: -45, longitude: 166, timestamp: t(0) },
      { latitude: -45, longitude: 166.002, timestamp: t(1) },
      { latitude: -36, longitude: 175, timestamp: t(60 * 24 * 30) }, // a month later
      { latitude: -36, longitude: 175.002, timestamp: t(60 * 24 * 30 + 1) },
    ]
    const segments = splitOnGaps(points, rule)
    expect(segments).toHaveLength(2)
    expect(segments[0]).toHaveLength(2)
    expect(segments[1]).toHaveLength(2)
  })

  it('keeps a continuous track in one segment', () => {
    expect(splitOnGaps(straightLine(10), rule)).toHaveLength(1)
  })

  it('handles an empty track', () => {
    expect(splitOnGaps([], rule)).toEqual([])
  })

  // Real satellite reports from the 18-24 Feb passage: 13.4h apart, implying
  // about 10 knots. That is a vessel under way, and joining them is the best
  // record of the passage that exists.
  it('joins sparse position reports that imply a plausible speed', () => {
    const points = [
      { latitude: -39.326, longitude: 169.424, timestamp: '2026-02-18T16:13:00Z' },
      { latitude: -40.063, longitude: 172.204, timestamp: '2026-02-19T05:37:51Z' },
      { latitude: -40.217, longitude: 173.164, timestamp: '2026-02-19T19:02:43Z' },
    ]
    expect(splitOnGaps(points, rule)).toHaveLength(1)
  })

  // Same interval, but the vessel could not have covered the distance. Drawing
  // the line would invent a course it never sailed.
  it('breaks where the implied speed is impossible', () => {
    const points = [
      { latitude: -45, longitude: 166, timestamp: '2026-02-18T00:00:00Z' },
      { latitude: -36, longitude: 175, timestamp: '2026-02-18T12:00:00Z' },
    ]
    expect(splitOnGaps(points, rule)).toHaveLength(2)
  })

  it('still breaks on a gap longer than the limit, however slow', () => {
    const points = [
      { latitude: -45, longitude: 166, timestamp: '2026-02-18T00:00:00Z' },
      { latitude: -45.01, longitude: 166.01, timestamp: '2026-02-24T00:00:00Z' },
    ]
    expect(splitOnGaps(points, rule)).toHaveLength(2)
  })
})

describe('simplifyTrackToBudget', () => {
  const opts = { toleranceMetres: 12, maxPoints: 1000, maxGapMs: 18 * 3600_000, maxImpliedKnots: 20 }

  it('stays within the point budget', () => {
    // Dense zigzag: every point is a turn, so tolerance must widen to fit.
    const points = Array.from({ length: 20_000 }, (_, i) => ({
      latitude: -45 + (i % 2) * 0.01,
      longitude: 166 + i * 0.0005,
      timestamp: t(i),
    }))

    const result = simplifyTrackToBudget(points, opts)
    expect(result.points.length).toBeLessThanOrEqual(1000)
    expect(result.toleranceUsed).toBeGreaterThan(12)
    // Deliberately the worst case for Douglas-Peucker, so it is seconds rather
    // than milliseconds. The default 5s limit makes it flaky on a busy machine
    // without saying anything useful about a regression.
  }, 30_000)

  it('leaves a track that already fits at the requested tolerance', () => {
    const result = simplifyTrackToBudget(straightLine(500), opts)
    expect(result.toleranceUsed).toBe(12)
    expect(result.points).toHaveLength(2)
  })

  // Simplifying across a break would let the huge spanning line dominate the
  // geometry and swallow real detail on both sides of it.
  it('does not simplify across a break in the record', () => {
    const leg = (lonBase: number, minuteBase: number) =>
      Array.from({ length: 20 }, (_, i) => ({
        latitude: -45 + Math.sin(i / 5) * 0.002,
        longitude: lonBase + i * 0.002,
        timestamp: t(minuteBase + i),
      }))

    const points = [...leg(166, 0), ...leg(175, 60 * 24 * 30)]
    const result = simplifyTrackToBudget(points, opts)

    expect(result.segments).toBe(2)
    // Both legs keep their own endpoints.
    expect(result.points.filter((p) => p.longitude < 170).length).toBeGreaterThan(1)
    expect(result.points.filter((p) => p.longitude > 170).length).toBeGreaterThan(1)
  })

  it('reports how many segments the track broke into', () => {
    expect(simplifyTrackToBudget(straightLine(100), opts).segments).toBe(1)
  })
})

describe('segment boundaries for rendering', () => {
  const opts = { toleranceMetres: 12, maxPoints: 10_000, maxGapMs: 18 * 3600_000, maxImpliedKnots: 20 }

  // The map cannot infer a break from distance: simplification legitimately
  // leaves hundreds of kilometres between two consecutive points on a straight
  // ocean leg. The server has to say where the breaks are.
  it('returns the simplified points grouped by segment', () => {
    const leg = (lonBase: number, minuteBase: number) =>
      Array.from({ length: 30 }, (_, i) => ({
        latitude: -45 + Math.sin(i / 5) * 0.002,
        longitude: lonBase + i * 0.002,
        timestamp: new Date(Date.UTC(2026, 2, 1, 0, minuteBase + i)).toISOString(),
      }))

    const result = simplifyTrackToBudget(
      [...leg(166, 0), ...leg(175, 60 * 24 * 30)],
      opts
    )

    expect(result.segmented).toHaveLength(2)
    expect(result.segmented.flat()).toHaveLength(result.points.length)

    // Each group stays on its own side of the break.
    expect(result.segmented[0].every((p) => p.longitude < 170)).toBe(true)
    expect(result.segmented[1].every((p) => p.longitude > 170)).toBe(true)
  })

  it('groups a continuous track into a single segment', () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      latitude: -45 + Math.sin(i / 5) * 0.002,
      longitude: 166 + i * 0.002,
      timestamp: new Date(Date.UTC(2026, 2, 1, 0, i)).toISOString(),
    }))

    expect(simplifyTrackToBudget(points, opts).segmented).toHaveLength(1)
  })
})

describe('speed test only applies to long gaps', () => {
  const rule = { maxGapMs: 18 * 3600_000, maxImpliedKnots: 20 }

  // Imported tracks sample every second or two. Across one second, ten metres
  // of ordinary GPS scatter implies twenty knots — applying the speed test
  // there measures noise, not movement, and shredded a continuous track into
  // dozens of pieces.
  it('ignores GPS jitter between points a second apart', () => {
    const points = Array.from({ length: 60 }, (_, i) => ({
      latitude: -43.1334 + (i % 2 ? 0.0001 : 0), // ~11m of scatter
      longitude: 168.9446 + i * 0.00002,
      timestamp: new Date(Date.UTC(2026, 1, 24, 6, 21, i)).toISOString(),
    }))

    expect(splitOnGaps(points, rule)).toHaveLength(1)
  })

  it('still applies the speed test across a long gap', () => {
    const points = [
      { latitude: -45, longitude: 166, timestamp: '2026-02-18T00:00:00Z' },
      { latitude: -36, longitude: 175, timestamp: '2026-02-18T12:00:00Z' },
    ]
    expect(splitOnGaps(points, rule)).toHaveLength(2)
  })

  it('honours an explicit minimum gap for the speed test', () => {
    const points = [
      { latitude: -45, longitude: 166, timestamp: '2026-02-18T00:00:00Z' },
      { latitude: -45.2, longitude: 166, timestamp: '2026-02-18T00:05:00Z' }, // ~267kn
    ]
    // Below the threshold the pair is left alone; above it, the jump is caught.
    expect(splitOnGaps(points, { ...rule, minGapForSpeedCheckMs: 10 * 60_000 })).toHaveLength(1)
    expect(splitOnGaps(points, { ...rule, minGapForSpeedCheckMs: 60_000 })).toHaveLength(2)
  })
})

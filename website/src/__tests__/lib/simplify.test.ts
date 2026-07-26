import { describe, it, expect } from 'vitest'
import {
  simplifyTrack,
  splitOnTimeGaps,
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

describe('splitOnTimeGaps', () => {
  it('splits where the record jumps', () => {
    const points = [
      { latitude: -45, longitude: 166, timestamp: t(0) },
      { latitude: -45, longitude: 166.01, timestamp: t(1) },
      { latitude: -36, longitude: 175, timestamp: t(60 * 24 * 30) }, // a month later
      { latitude: -36, longitude: 175.01, timestamp: t(60 * 24 * 30 + 1) },
    ]
    const segments = splitOnTimeGaps(points, 6 * 3600_000)
    expect(segments).toHaveLength(2)
    expect(segments[0]).toHaveLength(2)
    expect(segments[1]).toHaveLength(2)
  })

  it('keeps a continuous track in one segment', () => {
    expect(splitOnTimeGaps(straightLine(10), 6 * 3600_000)).toHaveLength(1)
  })

  it('handles an empty track', () => {
    expect(splitOnTimeGaps([], 1000)).toEqual([])
  })
})

describe('simplifyTrackToBudget', () => {
  const opts = { toleranceMetres: 12, maxPoints: 1000, maxGapMs: 6 * 3600_000 }

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
  })

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
        latitude: -45 + Math.sin(i) * 0.01,
        longitude: lonBase + i * 0.001,
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

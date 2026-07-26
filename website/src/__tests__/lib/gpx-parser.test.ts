import { describe, it, expect } from 'vitest'
import { parseGPX } from '@/lib/gpx-parser'

const timedTrack = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="-35.70" lon="174.30"><time>2026-03-01T10:00:00Z</time></trkpt>
    <trkpt lat="-35.71" lon="174.31"><time>2026-03-01T10:05:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`

const untimedTrack = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="-35.70" lon="174.30"/>
    <trkpt lat="-35.71" lon="174.31"/>
    <trkpt lat="-35.72" lon="174.32"/>
  </trkseg></trk>
</gpx>`

describe('parseGPX', () => {
  it('preserves real timestamps', () => {
    const result = parseGPX(timedTrack)

    expect(result.success).toBe(true)
    expect(result.points).toHaveLength(2)
    expect(result.points[0].timestamp).toBe('2026-03-01T10:00:00Z')
    expect(result.stats.pointsWithTimestamps).toBe(2)
  })

  // The parser used to stamp untimed points with year-9999 sentinels, which
  // then sorted after every real position and broke the merge with live data.
  it('reports missing timestamps as null rather than inventing them', () => {
    const result = parseGPX(untimedTrack)

    expect(result.points).toHaveLength(3)
    expect(result.points.every((p) => p.timestamp === null)).toBe(true)
    expect(result.stats.pointsWithTimestamps).toBe(0)
  })

  it('never emits a year-9999 timestamp', () => {
    const serialised = JSON.stringify(parseGPX(untimedTrack).points)
    expect(serialised).not.toContain('9999')
  })

  it('keeps file order for untimed points via pointIndex', () => {
    const result = parseGPX(untimedTrack)

    expect(result.points.map((p) => p.pointIndex)).toEqual([0, 1, 2])
    expect(result.points.map((p) => p.longitude)).toEqual([174.3, 174.31, 174.32])
  })

  it('rejects out-of-range times instead of trusting them', () => {
    const result = parseGPX(`<gpx><trk><trkseg>
      <trkpt lat="-35.70" lon="174.30"><time>9999-01-01T00:00:00Z</time></trkpt>
    </trkseg></trk></gpx>`)

    expect(result.points[0].timestamp).toBeNull()
  })

  // Ordering must be chronological so imported points interleave with live
  // ones, rather than all GPX sorting ahead of all live positions by segment.
  it('orders by time across segments, not by segment first', () => {
    const result = parseGPX(`<gpx><trk>
      <trkseg><trkpt lat="-35.70" lon="174.30"><time>2026-03-02T10:00:00Z</time></trkpt></trkseg>
      <trkseg><trkpt lat="-35.71" lon="174.31"><time>2026-03-01T10:00:00Z</time></trkpt></trkseg>
    </trk></gpx>`)

    expect(result.points.map((p) => p.timestamp)).toEqual([
      '2026-03-01T10:00:00Z',
      '2026-03-02T10:00:00Z',
    ])
  })

  it('places timed points before untimed ones', () => {
    const result = parseGPX(`<gpx><trk><trkseg>
      <trkpt lat="-35.70" lon="174.30"/>
      <trkpt lat="-35.71" lon="174.31"><time>2026-03-01T10:00:00Z</time></trkpt>
    </trkseg></trk></gpx>`)

    expect(result.points[0].timestamp).toBe('2026-03-01T10:00:00Z')
    expect(result.points[1].timestamp).toBeNull()
  })

  it('warns when only some points carry timestamps', () => {
    const result = parseGPX(`<gpx><trk><trkseg>
      <trkpt lat="-35.70" lon="174.30"/>
      <trkpt lat="-35.71" lon="174.31"><time>2026-03-01T10:00:00Z</time></trkpt>
    </trkseg></trk></gpx>`)

    expect(result.warnings.join(' ')).toMatch(/1 of 2 points have timestamps/)
  })

  it('handles self-closing and full trkpt tags alike', () => {
    const result = parseGPX(`<gpx><trk><trkseg>
      <trkpt lat="-35.70" lon="174.30"/>
      <trkpt lon="174.31" lat="-35.71"><time>2026-03-01T10:00:00Z</time></trkpt>
    </trkseg></trk></gpx>`)

    expect(result.points).toHaveLength(2)
  })

  it('rejects coordinates outside valid ranges', () => {
    const result = parseGPX(`<gpx><trk><trkseg>
      <trkpt lat="-95.0" lon="174.30"/>
      <trkpt lat="-35.71" lon="174.31"/>
    </trkseg></trk></gpx>`)

    expect(result.points).toHaveLength(1)
    expect(result.points[0].latitude).toBe(-35.71)
  })
})

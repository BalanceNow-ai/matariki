import { describe, it, expect } from 'vitest'
import { simplifyTrackToBudget } from '@/lib/simplify'

/** A track shaped like real sailing: gentle course changes, time at anchor. */
function makeTrack(n: number) {
  const pts = []
  let lat = -45.5, lon = 166.8, hdg = 0.7
  const t0 = Date.UTC(2026, 1, 1)
  for (let i = 0; i < n; i++) {
    if (i % 3000 < 300) {
      pts.push({ latitude: lat + (Math.random() - 0.5) * 0.00008,
                 longitude: lon + (Math.random() - 0.5) * 0.00008,
                 timestamp: new Date(t0 + i * 60000).toISOString() })
      continue
    }
    hdg += (Math.random() - 0.5) * 0.06
    lat += Math.cos(hdg) * 0.0016
    lon += Math.sin(hdg) * 0.0016
    pts.push({ latitude: lat, longitude: lon, timestamp: new Date(t0 + i * 60000).toISOString() })
  }
  return pts
}

describe('simplify performance on realistic tracks', () => {
  it('handles a full-size track within a request budget', () => {
    for (const n of [50_000, 130_000, 205_000]) {
      const track = makeTrack(n)
      const start = performance.now()
      const r = simplifyTrackToBudget(track, {
        toleranceMetres: 12, maxPoints: 60_000, maxGapMs: 6 * 3600_000,
      })
      const ms = performance.now() - start
      const mb = JSON.stringify(r.points).length / 1048576

      console.log(
        `${n} -> ${r.points.length} kept (${(100 * r.points.length / n).toFixed(1)}%), ` +
        `tol=${r.toleranceUsed}m, ${ms.toFixed(0)}ms, ${mb.toFixed(2)} MB`
      )

      expect(ms).toBeLessThan(5000)
      expect(mb).toBeLessThan(6)
    }
  }, 60_000)
})

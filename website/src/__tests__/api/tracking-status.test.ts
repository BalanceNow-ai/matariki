import { describe, it, expect } from 'vitest'
import { assessTracking, formatAge } from '@/app/api/position/tracking-status'

const NOW = new Date('2026-07-26T06:00:00Z').getTime()
const minutesAgo = (n: number) => new Date(NOW - n * 60_000).toISOString()

describe('assessTracking', () => {
  it('reports ok when contact and fix are both recent', () => {
    const result = assessTracking({
      now: NOW,
      lastContactAt: minutesAgo(1),
      lastFixAt: minutesAgo(1),
      fixAgeMs: 60_000,
      hasLiveFix: true,
    })

    expect(result.condition).toBe('ok')
  })

  // The live failure this was written for: the transmitter is healthy and
  // reporting every minute, but every payload carries a null position.
  it('distinguishes a transmitting vessel with no GPS fix from a silent one', () => {
    const result = assessTracking({
      now: NOW,
      lastContactAt: minutesAgo(1),
      lastFixAt: minutesAgo(66 * 24 * 60),
      fixAgeMs: 66 * 24 * 3600_000,
      hasLiveFix: true,
    })

    expect(result.condition).toBe('no-gps-fix')
    expect(result.summary).toMatch(/transmitting/i)
    expect(result.summary).toMatch(/no GPS fix/i)
  })

  it('reports loss of contact when no webhook has arrived recently', () => {
    const result = assessTracking({
      now: NOW,
      lastContactAt: minutesAgo(120),
      lastFixAt: minutesAgo(120),
      fixAgeMs: 120 * 60_000,
      hasLiveFix: true,
    })

    expect(result.condition).toBe('no-contact')
    expect(result.summary).toMatch(/No contact/i)
  })

  // Loss of contact outranks a stale fix: if nothing is arriving, the GPS is
  // not the thing to go and look at.
  it('prefers no-contact over no-gps-fix when both apply', () => {
    const result = assessTracking({
      now: NOW,
      lastContactAt: minutesAgo(600),
      lastFixAt: minutesAgo(600),
      fixAgeMs: 600 * 60_000,
      hasLiveFix: false,
    })

    expect(result.condition).toBe('no-contact')
  })

  it('reports never-reported when nothing has ever arrived', () => {
    const result = assessTracking({
      now: NOW,
      lastContactAt: null,
      lastFixAt: null,
      fixAgeMs: 0,
      hasLiveFix: false,
    })

    expect(result.condition).toBe('never-reported')
  })

  it('treats a fallback position as no fix even with fresh contact', () => {
    const result = assessTracking({
      now: NOW,
      lastContactAt: minutesAgo(1),
      lastFixAt: minutesAgo(1),
      fixAgeMs: 60_000,
      hasLiveFix: false,
    })

    expect(result.condition).toBe('no-gps-fix')
  })
})

describe('formatAge', () => {
  it('scales units with magnitude', () => {
    expect(formatAge(5_000)).toBe('5s')
    expect(formatAge(120_000)).toBe('2m')
    expect(formatAge(7_200_000)).toBe('2.0h')
    expect(formatAge(172_800_000)).toBe('2.0d')
  })
})

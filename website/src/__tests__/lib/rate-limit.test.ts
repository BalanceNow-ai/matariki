import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { checkRateLimit, clientKey, resetRateLimits } from '@/lib/rate-limit'

const opts = { windowMs: 60_000, max: 3 }

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('permits requests up to the limit', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('a', opts).limited).toBe(false)
    }
  })

  it('blocks the request after the limit', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', opts)
    expect(checkRateLimit('a', opts).limited).toBe(true)
  })

  it('counts each key separately', () => {
    for (let i = 0; i < 4; i++) checkRateLimit('a', opts)
    expect(checkRateLimit('b', opts).limited).toBe(false)
  })

  it('reports remaining allowance', () => {
    expect(checkRateLimit('a', opts).remaining).toBe(2)
    expect(checkRateLimit('a', opts).remaining).toBe(1)
    expect(checkRateLimit('a', opts).remaining).toBe(0)
  })

  it('frees the allowance once the window passes', () => {
    for (let i = 0; i < 4; i++) checkRateLimit('a', opts)
    expect(checkRateLimit('a', opts).limited).toBe(true)

    vi.advanceTimersByTime(60_001)

    expect(checkRateLimit('a', opts).limited).toBe(false)
  })

  it('suggests a retry delay only when limited', () => {
    expect(checkRateLimit('a', opts).retryAfterSeconds).toBe(0)
    for (let i = 0; i < 3; i++) checkRateLimit('a', opts)
    expect(checkRateLimit('a', opts).retryAfterSeconds).toBeGreaterThan(0)
  })
})

describe('clientKey', () => {
  it('uses the first entry of x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    })
    expect(clientKey(request)).toBe('203.0.113.5')
  })

  it('falls back to x-real-ip', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '203.0.113.9' },
    })
    expect(clientKey(request)).toBe('203.0.113.9')
  })

  it('falls back to a constant when the origin is unknown', () => {
    expect(clientKey(new Request('http://localhost'))).toBe('unknown')
  })
})

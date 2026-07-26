import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Redis store
vi.mock('@/app/api/position/redis-store', () => ({
  getLatestPositionAsync: vi.fn(),
  setLatestPositionAsync: vi.fn(),
  addRequestLogAsync: vi.fn(),
}))

// Import after mocking
import { GET, POST } from '@/app/api/position/route'
import { getLatestPositionAsync, setLatestPositionAsync } from '@/app/api/position/redis-store'

const mockPosition = {
  latitude: -35.7275,
  longitude: 174.3278,
  timestamp: '2026-03-01T10:00:00Z',
  source: 'signalk' as const,
  speedOverGround: 6.5,
  name: 'Matariki III',
  mmsi: '512004962',
}

const fallbackPosition = {
  latitude: -35.7275,
  longitude: 174.3278,
  timestamp: expect.any(String),
  source: 'fallback',
  name: 'Matariki III',
  location: 'Whangarei, New Zealand',
}

describe('GET /api/position', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the latest position', async () => {
    vi.mocked(getLatestPositionAsync).mockResolvedValueOnce(mockPosition)

    const response = await GET()
    const data = await response.json()

    expect(data).toEqual(mockPosition)
  })

  it('returns fallback position when no position stored', async () => {
    vi.mocked(getLatestPositionAsync).mockResolvedValueOnce(fallbackPosition)

    const response = await GET()
    const data = await response.json()

    expect(data.source).toBe('fallback')
    expect(data.latitude).toBe(-35.7275)
    expect(data.longitude).toBe(174.3278)
  })
})

/** A write that both stores accepted. */
const okWrite = { postgres: 'ok', redis: 'ok', trimmed: false, durable: true } as const

/** A write that reached nothing — the case that must not report success. */
const failedWrite = {
  postgres: 'error',
  redis: 'error',
  trimmed: false,
  durable: false,
} as const

describe('POST /api/position', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    // Default: storage succeeds. Individual tests override to assert failure
    // handling.
    vi.mocked(setLatestPositionAsync).mockResolvedValue(okWrite)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  // Note: Authentication tests skipped because SIGNALK_WEBHOOK_SECRET is read at
  // module import time and cannot be easily changed in tests. The authentication
  // logic should be tested via integration tests with the actual environment.

  describe('authentication (when no secret configured)', () => {
    it('accepts requests without authentication token', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({ latitude: -35.7, longitude: 174.3 }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('accepts Bearer token in header', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer anytoken',
        },
        body: JSON.stringify({ latitude: -35.7, longitude: 174.3 }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('accepts X-Auth-Token header', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        headers: {
          'X-Auth-Token': 'anytoken',
        },
        body: JSON.stringify({ latitude: -35.7, longitude: 174.3 }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('accepts query parameter token', async () => {
      const request = new NextRequest('http://localhost/api/position?token=anytoken', {
        method: 'POST',
        body: JSON.stringify({ latitude: -35.7, longitude: 174.3 }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('payload formats', () => {
    beforeEach(() => {
      delete process.env.SIGNALK_WEBHOOK_SECRET
    })

    it('accepts simplified format', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({
          latitude: -35.7275,
          longitude: 174.3278,
          speedOverGround: 6.5,
          courseOverGround: 180,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.position.latitude).toBe(-35.7275)
      expect(data.position.longitude).toBe(174.3278)
      expect(setLatestPositionAsync).toHaveBeenCalled()
    })

    it('accepts Signal K delta format', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({
          updates: [{
            values: [{
              path: 'navigation.position',
              value: { latitude: -35.7275, longitude: 174.3278 },
            }],
          }],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.position.latitude).toBe(-35.7275)
    })

    it('accepts nested position format (MSP webhook)', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({
          position: {
            value: { latitude: -35.7275, longitude: 174.3278 },
          },
          speed: { value: 3.0 }, // m/s
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.position.latitude).toBe(-35.7275)
    })

    it('returns 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: 'not json',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid JSON')
    })

    it('returns 400 for missing coordinates', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({ name: 'Matariki III' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid payload format')
    })
  })

  describe('data conversion', () => {
    beforeEach(() => {
      delete process.env.SIGNALK_WEBHOOK_SECRET
    })

    it('converts speed from m/s to knots in nested format', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({
          position: { value: { latitude: -35.7, longitude: 174.3 } },
          speed: { value: 5.144 }, // ~10 knots in m/s
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.position.speedOverGround).toBeCloseTo(10, 0)
    })

    it('converts COG from radians to degrees', async () => {
      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({
          position: { value: { latitude: -35.7, longitude: 174.3 } },
          cog: { value: Math.PI }, // 180 degrees
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.position.courseOverGround).toBeCloseTo(180, 0)
    })
  })

  // The webhook used to answer 200 no matter what happened downstream, so a
  // position that reached no store still looked accepted and was never resent.
  // That is how tracking went dark for 45 days without anyone noticing.
  describe('storage failure reporting', () => {
    const payloads: Array<[string, object]> = [
      ['simplified', { latitude: -35.7, longitude: 174.3 }],
      [
        'nested position',
        { position: { value: { latitude: -35.7, longitude: 174.3 } } },
      ],
      [
        'Signal K delta',
        {
          updates: [
            {
              values: [
                { path: 'navigation.position', value: { latitude: -35.7, longitude: 174.3 } },
              ],
            },
          ],
        },
      ],
    ]

    it.each(payloads)('returns 503 when no store accepts a %s payload', async (_name, body) => {
      vi.mocked(setLatestPositionAsync).mockResolvedValue(failedWrite)

      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.error).toMatch(/could not be stored/i)
    })

    it('still reports success when only Postgres is unavailable', async () => {
      vi.mocked(setLatestPositionAsync).mockResolvedValue({
        postgres: 'skipped',
        redis: 'ok',
        trimmed: false,
        durable: true,
      })

      const request = new NextRequest('http://localhost/api/position', {
        method: 'POST',
        body: JSON.stringify({ latitude: -35.7, longitude: 174.3 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stores).toEqual({ postgres: 'skipped', redis: 'ok' })
    })
  })
})

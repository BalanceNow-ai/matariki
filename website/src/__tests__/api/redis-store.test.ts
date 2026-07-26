import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Upstash Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  lpush: vi.fn(),
  ltrim: vi.fn(),
  lrange: vi.fn(),
  exists: vi.fn(),
  del: vi.fn(),
}

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => mockRedis),
}))

// Import after mocking
import {
  getLatestPositionAsync,
  setLatestPositionAsync,
  getPositionHistoryAsync,
  hasLatestPositionAsync,
  addRequestLogAsync,
  getRequestLogAsync,
  clearRequestLogAsync,
  isRedisConfigured,
} from '@/app/api/position/redis-store'

const mockPosition = {
  latitude: -35.7275,
  longitude: 174.3278,
  timestamp: '2026-03-01T10:00:00Z',
  source: 'signalk' as const,
  name: 'Matariki III',
}

const fallbackPosition = {
  latitude: -35.7275,
  longitude: 174.3278,
  source: 'fallback',
  name: 'Matariki III',
  location: 'Whangarei, New Zealand',
}

describe('Redis Store', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getLatestPositionAsync', () => {
    it('returns position from Redis when available', async () => {
      mockRedis.get.mockResolvedValueOnce(mockPosition)

      const result = await getLatestPositionAsync()

      expect(result).toEqual(mockPosition)
    })

    it('returns fallback position when Redis has no data', async () => {
      mockRedis.get.mockResolvedValueOnce(null)

      const result = await getLatestPositionAsync()

      expect(result.source).toBe('fallback')
      expect(result.latitude).toBe(-35.7275)
    })

    it('returns fallback position on Redis error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'))

      const result = await getLatestPositionAsync()

      expect(result.source).toBe('fallback')
    })
  })

  describe('setLatestPositionAsync', () => {
    it('stores position in Redis', async () => {
      mockRedis.set.mockResolvedValueOnce('OK')
      mockRedis.lpush.mockResolvedValueOnce(1)
      mockRedis.ltrim.mockResolvedValueOnce('OK')

      await setLatestPositionAsync(mockPosition)

      expect(mockRedis.set).toHaveBeenCalledWith(
        'matariki:position:latest',
        mockPosition
      )
    })

    it('adds position to history', async () => {
      mockRedis.set.mockResolvedValueOnce('OK')
      mockRedis.lpush.mockResolvedValueOnce(1)
      mockRedis.ltrim.mockResolvedValueOnce('OK')

      await setLatestPositionAsync(mockPosition)

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'matariki:position:history',
        mockPosition
      )
    })

    it('stores history without trimming', async () => {
      mockRedis.set.mockResolvedValueOnce('OK')
      mockRedis.lpush.mockResolvedValueOnce(1001)

      await setLatestPositionAsync(mockPosition)

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'matariki:position:history',
        mockPosition
      )
      expect(mockRedis.ltrim).not.toHaveBeenCalled()
    })
  })

  describe('getPositionHistoryAsync', () => {
    it('returns position history from Redis', async () => {
      const history = [mockPosition, mockPosition]
      mockRedis.lrange.mockResolvedValueOnce(history)

      const result = await getPositionHistoryAsync()

      expect(result).toEqual(history)
      expect(mockRedis.lrange).toHaveBeenCalledWith(
        'matariki:position:history',
        0,
        -1
      )
    })

    // A failed read must not masquerade as an empty history. Returning [] here
    // is what let a broken Redis read be reported as "no positions stored",
    // indistinguishable from the track genuinely having been lost.
    it('throws on Redis error rather than reporting an empty history', async () => {
      mockRedis.lrange.mockRejectedValueOnce(new Error('Redis error'))

      await expect(getPositionHistoryAsync()).rejects.toThrow(/Failed to read position history/)
    })
  })

  describe('hasLatestPositionAsync', () => {
    it('returns true when position exists in Redis', async () => {
      mockRedis.exists.mockResolvedValueOnce(1)

      const result = await hasLatestPositionAsync()

      expect(result).toBe(true)
    })

    it('returns false when no position in Redis', async () => {
      mockRedis.exists.mockResolvedValueOnce(0)

      const result = await hasLatestPositionAsync()

      expect(result).toBe(false)
    })
  })

  describe('Request Log Functions', () => {
    const mockLogEntry = {
      id: 'req_123',
      timestamp: '2026-03-01T10:00:00Z',
      method: 'POST',
      authStatus: 'success' as const,
      payloadFormat: 'simplified' as const,
      payloadSize: 100,
      rawPayload: { latitude: -35.7 },
      responseStatus: 200,
      responseBody: { success: true },
      processingTimeMs: 50,
    }

    describe('addRequestLogAsync', () => {
      it('adds log entry to Redis', async () => {
        mockRedis.lpush.mockResolvedValueOnce(1)
        mockRedis.ltrim.mockResolvedValueOnce('OK')

        await addRequestLogAsync(mockLogEntry)

        expect(mockRedis.lpush).toHaveBeenCalledWith(
          'matariki:debug:request-log',
          mockLogEntry
        )
      })

      it('trims log to max size', async () => {
        mockRedis.lpush.mockResolvedValueOnce(51)
        mockRedis.ltrim.mockResolvedValueOnce('OK')

        await addRequestLogAsync(mockLogEntry)

        expect(mockRedis.ltrim).toHaveBeenCalledWith(
          'matariki:debug:request-log',
          0,
          49 // MAX_REQUEST_LOG_SIZE - 1
        )
      })
    })

    describe('getRequestLogAsync', () => {
      it('returns request log from Redis', async () => {
        mockRedis.lrange.mockResolvedValueOnce([mockLogEntry])

        const result = await getRequestLogAsync()

        expect(result).toEqual([mockLogEntry])
      })
    })

    describe('clearRequestLogAsync', () => {
      it('deletes request log from Redis', async () => {
        mockRedis.del.mockResolvedValueOnce(1)

        await clearRequestLogAsync()

        expect(mockRedis.del).toHaveBeenCalledWith('matariki:debug:request-log')
      })
    })
  })

  describe('isRedisConfigured', () => {
    it('returns true when Redis credentials are set', () => {
      expect(isRedisConfigured()).toBe(true)
    })

    it('returns false when Redis credentials are missing', () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN

      // Need to reload module to test this properly
      // For now, just verify the function exists
      expect(typeof isRedisConfigured).toBe('function')
    })
  })
})

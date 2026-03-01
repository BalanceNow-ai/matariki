import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSignalK, toKnots, formatCoordinates, timeSince } from '@/hooks/useSignalK'

// Mock position data
const mockPosition = {
  latitude: -35.7275,
  longitude: 174.3278,
  timestamp: new Date().toISOString(),
  source: 'signalk' as const,
  speedOverGround: 6.5,
  courseOverGround: 180,
  heading: 175,
  name: 'Matariki III',
  mmsi: '512004962',
}

describe('useSignalK hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch on mount when autoStart is false', () => {
    const { result } = renderHook(() => useSignalK({ autoStart: false }))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.position).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('provides refetch function', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPosition),
    } as Response)

    const { result } = renderHook(() => useSignalK({ autoStart: false }))

    await act(async () => {
      await result.current.refetch()
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.current.position).toEqual(mockPosition)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response)

    const { result } = renderHook(() => useSignalK({ autoStart: false }))

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.error).toBe('HTTP 500: Internal Server Error')
    expect(result.current.position).toBeNull()
  })

  it('sets error on network failure', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSignalK({ autoStart: false }))

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.error).toBe('Network error')
  })

  it('updates lastUpdated on successful fetch', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPosition),
    } as Response)

    const { result } = renderHook(() => useSignalK({ autoStart: false }))

    expect(result.current.lastUpdated).toBeNull()

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.lastUpdated).toBeInstanceOf(Date)
  })

  it('calls API with correct options', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPosition),
    } as Response)

    const { result } = renderHook(() => useSignalK({ autoStart: false }))

    await act(async () => {
      await result.current.refetch()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/position', { cache: 'no-store' })
  })

  it('exposes startPolling and stopPolling functions', () => {
    const { result } = renderHook(() => useSignalK({ autoStart: false }))

    expect(typeof result.current.startPolling).toBe('function')
    expect(typeof result.current.stopPolling).toBe('function')
  })
})

describe('toKnots', () => {
  it('converts m/s to knots', () => {
    expect(toKnots(1)).toBeCloseTo(1.94384, 4)
    expect(toKnots(5.144)).toBeCloseTo(10, 1) // ~10 knots
  })

  it('returns undefined for undefined input', () => {
    expect(toKnots(undefined)).toBeUndefined()
  })

  it('handles zero', () => {
    expect(toKnots(0)).toBe(0)
  })
})

describe('formatCoordinates (hook version)', () => {
  it('formats coordinates in degrees and minutes', () => {
    const result = formatCoordinates(-35.7275, 174.3278)
    expect(result).toContain('35°')
    expect(result).toContain('S')
    expect(result).toContain('174°')
    expect(result).toContain('E')
  })

  it('handles positive latitude (North)', () => {
    const result = formatCoordinates(35.7275, 174.3278)
    expect(result).toContain('N')
  })

  it('handles negative longitude (West)', () => {
    const result = formatCoordinates(-35.7275, -174.3278)
    expect(result).toContain('W')
  })
})

describe('timeSince', () => {
  it('returns "Just now" for recent timestamps', () => {
    const now = new Date()
    expect(timeSince(now.toISOString())).toBe('Just now')
  })

  it('returns minutes for timestamps < 1 hour', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
    expect(timeSince(thirtyMinAgo.toISOString())).toBe('30 min ago')
  })

  it('returns hours for timestamps < 1 day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(timeSince(twoHoursAgo.toISOString())).toBe('2 hours ago')
  })

  it('returns days for older timestamps', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    expect(timeSince(twoDaysAgo.toISOString())).toBe('2 days ago')
  })
})

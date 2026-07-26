import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The auth module reads the secret when it is first evaluated, and imports are
// hoisted above ordinary statements — so this has to run in a hoisted block to
// land before the route (and its auth import) is loaded.
const { SECRET } = vi.hoisted(() => {
  const value = 'test-secret-value'
  process.env.SIGNALK_WEBHOOK_SECRET = value
  return { SECRET: value }
})

vi.mock('@/app/api/position/redis-store', () => ({
  importTrackFromGPX: vi.fn(),
}))

import { POST } from '@/app/api/position/import-gpx/route'
import { importTrackFromGPX } from '@/app/api/position/redis-store'

const durableResult = {
  imported: 2,
  total: 2,
  durable: true,
  skipped: 0,
  failed: 0,
  importId: 'test-import',
}

function post(body: object) {
  return new NextRequest('http://localhost/api/position/import-gpx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SECRET,
    },
    body: JSON.stringify(body),
  })
}

const timedPoints = [
  { latitude: -35.7, longitude: 174.3, timestamp: '2026-03-01T10:00:00Z', pointIndex: 0 },
  { latitude: -35.71, longitude: 174.31, timestamp: '2026-03-01T10:05:00Z', pointIndex: 1 },
]

const untimedPoints = [
  { latitude: -35.7, longitude: 174.3, timestamp: null, pointIndex: 0 },
  { latitude: -35.71, longitude: 174.31, timestamp: null, pointIndex: 1 },
  { latitude: -35.72, longitude: 174.32, timestamp: null, pointIndex: 2 },
]

describe('POST /api/position/import-gpx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(importTrackFromGPX).mockResolvedValue(durableResult)
  })

  it('rejects an unauthenticated request', async () => {
    const request = new NextRequest('http://localhost/api/position/import-gpx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: timedPoints }),
    })

    expect((await POST(request)).status).toBe(401)
  })

  it('imports points that already carry timestamps', async () => {
    const response = await POST(post({ points: timedPoints }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(importTrackFromGPX).toHaveBeenCalled()
  })

  // Untimed points used to be stamped with Date.now(), silently dating an old
  // voyage to the moment of upload.
  it('refuses untimed points unless a start time is supplied', async () => {
    const response = await POST(post({ points: untimedPoints }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/start time/i)
    expect(data.untimedCount).toBe(3)
    expect(importTrackFromGPX).not.toHaveBeenCalled()
  })

  it('spaces untimed points across the supplied window', async () => {
    const response = await POST(
      post({
        points: untimedPoints,
        startTime: '2026-03-01T10:00:00Z',
        endTime: '2026-03-01T11:00:00Z',
      })
    )

    expect(response.status).toBe(200)

    const sent = vi.mocked(importTrackFromGPX).mock.calls[0][0]
    const times = sent.map((p) => new Date(p.timestamp).getTime())

    expect(new Date(times[0]).toISOString()).toBe('2026-03-01T10:00:00.000Z')
    expect(new Date(times[2]).toISOString()).toBe('2026-03-01T11:00:00.000Z')
    // Evenly spaced: the middle point lands halfway.
    expect(new Date(times[1]).toISOString()).toBe('2026-03-01T10:30:00.000Z')
  })

  it('never invents a timestamp near the time of upload', async () => {
    await POST(post({ points: untimedPoints, startTime: '2020-01-01T00:00:00Z' }))

    const sent = vi.mocked(importTrackFromGPX).mock.calls[0][0]
    for (const p of sent) {
      expect(new Date(p.timestamp).getUTCFullYear()).toBe(2020)
    }
  })

  it('rejects an end time that precedes the start', async () => {
    const response = await POST(
      post({
        points: untimedPoints,
        startTime: '2026-03-01T11:00:00Z',
        endTime: '2026-03-01T10:00:00Z',
      })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/time window/i)
  })

  // An import that reached no durable store is a failure. Reporting it as a
  // success is how earlier imports were lost without anyone noticing.
  it('returns 503 when the import did not reach durable storage', async () => {
    vi.mocked(importTrackFromGPX).mockResolvedValue({
      ...durableResult,
      durable: false,
      failed: 2,
      imported: 0,
    })

    const response = await POST(post({ points: timedPoints }))
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.success).toBe(false)
    expect(data.message).toMatch(/nothing has been/i)
  })

  it('keeps every batch of one file under a single import id', async () => {
    await POST(post({ points: timedPoints, importId: 'my-file-import-1' }))

    expect(vi.mocked(importTrackFromGPX).mock.calls[0][1]).toEqual({
      importId: 'my-file-import-1',
    })
  })

  it('strips unexpected characters from a supplied import id', async () => {
    await POST(post({ points: timedPoints, importId: 'bad/../id;drop' }))

    const passed = vi.mocked(importTrackFromGPX).mock.calls[0][1]
    expect(passed?.importId).toBe('bad..iddrop')
  })

  it('rejects a points array with no usable coordinates', async () => {
    const response = await POST(post({ points: [{ name: 'nowhere' }] }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/no valid track points/i)
  })
})

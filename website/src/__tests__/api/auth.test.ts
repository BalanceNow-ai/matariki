import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const SECRET = 'super-secret-token-value'

/**
 * auth.ts reads the secret at module scope, so each test imports a fresh copy
 * with the environment it needs.
 */
async function loadAuth(secret?: string) {
  vi.resetModules()
  if (secret === undefined) {
    delete process.env.SIGNALK_WEBHOOK_SECRET
  } else {
    process.env.SIGNALK_WEBHOOK_SECRET = secret
  }
  return import('@/app/api/position/auth')
}

function req(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers })
}

describe('extractToken', () => {
  let auth: Awaited<ReturnType<typeof loadAuth>>

  beforeEach(async () => {
    auth = await loadAuth(SECRET)
  })

  it('reads a Bearer token', () => {
    const r = req('http://localhost/api/position', { Authorization: `Bearer ${SECRET}` })
    expect(auth.extractToken(r)).toEqual({ token: SECRET, method: 'bearer' })
  })

  it('reads the password half of Basic auth', () => {
    const encoded = Buffer.from(`user:${SECRET}`).toString('base64')
    const r = req('http://localhost/api/position', { Authorization: `Basic ${encoded}` })
    expect(auth.extractToken(r)).toEqual({ token: SECRET, method: 'basic' })
  })

  it('reads header variants', () => {
    expect(auth.extractToken(req('http://localhost/x', { 'X-Auth-Token': 'a' })).method)
      .toBe('x-auth-token')
    expect(auth.extractToken(req('http://localhost/x', { 'X-API-Key': 'a' })).method)
      .toBe('x-api-key')
  })

  // msp-webhook cannot send headers, so query parameters must keep working.
  it('reads query parameters', () => {
    expect(auth.extractToken(req('http://localhost/x?auth_key=a')).method).toBe('query-auth_key')
    expect(auth.extractToken(req('http://localhost/x?token=a')).method).toBe('query-token')
  })

  it('reports no token when none is present', () => {
    expect(auth.extractToken(req('http://localhost/x'))).toEqual({ token: null, method: 'none' })
  })
})

describe('tokensMatch', () => {
  let auth: Awaited<ReturnType<typeof loadAuth>>

  beforeEach(async () => {
    auth = await loadAuth(SECRET)
  })

  it('accepts an identical token', () => {
    expect(auth.tokensMatch(SECRET, SECRET)).toBe(true)
  })

  it('rejects a different token of the same length', () => {
    const wrong = 'x'.repeat(SECRET.length)
    expect(auth.tokensMatch(wrong, SECRET)).toBe(false)
  })

  it('rejects a token that merely shares a prefix', () => {
    expect(auth.tokensMatch(SECRET.slice(0, 5), SECRET)).toBe(false)
  })

  it('rejects null or absent values rather than treating them as equal', () => {
    expect(auth.tokensMatch(null, SECRET)).toBe(false)
    expect(auth.tokensMatch(SECRET, undefined)).toBe(false)
    expect(auth.tokensMatch(null, undefined)).toBe(false)
  })
})

describe('requireAuth', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('allows a correctly authenticated request', async () => {
    const auth = await loadAuth(SECRET)
    const r = req('http://localhost/x', { Authorization: `Bearer ${SECRET}` })
    expect(auth.requireAuth(r)).toBeNull()
  })

  it('returns 401 for a wrong token', async () => {
    const auth = await loadAuth(SECRET)
    const r = req('http://localhost/x', { Authorization: 'Bearer wrong' })
    expect(auth.requireAuth(r)?.status).toBe(401)
  })

  it('returns 401 when no token is supplied', async () => {
    const auth = await loadAuth(SECRET)
    expect(auth.requireAuth(req('http://localhost/x'))?.status).toBe(401)
  })

  // Fails closed: an unconfigured secret must not mean "let everyone in".
  it('returns 503 when no secret is configured, even with a token', async () => {
    const auth = await loadAuth(undefined)
    const r = req('http://localhost/x', { Authorization: 'Bearer anything' })

    const response = auth.requireAuth(r)
    expect(response?.status).toBe(503)
  })
})

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { POST } from '@/app/api/subscribe/route'

describe('POST /api/subscribe', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.BUTTONDOWN_API_KEY = 'test-api-key'
  })

  afterAll(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  describe('validation', () => {
    it('returns 400 for missing email', async () => {
      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Valid email is required')
    })

    it('returns 400 for invalid email format', async () => {
      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Valid email is required')
    })
  })

  describe('service configuration', () => {
    it('returns 503 when API key is not configured', async () => {
      delete process.env.BUTTONDOWN_API_KEY

      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(503)
      const data = await response.json()
      expect(data.error).toBe('Newsletter service is not configured')
    })
  })

  describe('successful subscription', () => {
    it('returns success for new subscriber', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com' }),
      })

      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('returns success with alreadySubscribed flag for 409', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ detail: 'Already subscribed' }),
      })

      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'existing@example.com' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.alreadySubscribed).toBe(true)
    })

    it('sends correct request to Buttondown API', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com' }),
      })

      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      await POST(request)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.buttondown.com/v1/subscribers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Token test-api-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      )
    })
  })

  describe('error handling', () => {
    it('returns 500 for Buttondown API errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Server error' }),
      })

      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to subscribe')
    })

    it('returns 500 for network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const request = new Request('http://localhost/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to subscribe')
    })
  })
})

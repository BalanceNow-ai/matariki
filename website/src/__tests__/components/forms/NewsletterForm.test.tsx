import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewsletterForm } from '@/components/forms/NewsletterForm'

describe('NewsletterForm component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders email input', () => {
      render(<NewsletterForm />)
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    })

    it('renders subscribe button', () => {
      render(<NewsletterForm />)
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument()
    })

    it('renders a form element', () => {
      render(<NewsletterForm />)
      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('requires email input', () => {
      render(<NewsletterForm />)
      const input = screen.getByPlaceholderText(/email/i)
      expect(input).toHaveAttribute('required')
    })

    it('has email type for validation', () => {
      render(<NewsletterForm />)
      const input = screen.getByPlaceholderText(/email/i)
      expect(input).toHaveAttribute('type', 'email')
    })
  })

  describe('submission', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response), 100)
        )
      )

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText(/email/i)
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      await user.click(button)

      expect(screen.getByRole('button')).toHaveTextContent(/subscribing/i)
    })

    it('shows success message on successful subscription', async () => {
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText(/email/i)
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/thanks for subscribing/i)).toBeInTheDocument()
      })
    })

    it('shows already subscribed message for duplicate', async () => {
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, alreadySubscribed: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText(/email/i)
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'existing@example.com')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/already subscribed/i)).toBeInTheDocument()
      })
    })

    it('shows error message on failure', async () => {
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Subscription failed' }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText(/email/i)
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })

    it('sends correct request to API', async () => {
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText(/email/i)
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      await user.click(button)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      })
    })
  })

  describe('button state', () => {
    it('disables button during loading', async () => {
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response), 500)
        )
      )

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText(/email/i)
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      await user.click(button)

      expect(button).toBeDisabled()
    })
  })

  describe('success state', () => {
    it('shows checkmark icon on success', async () => {
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText(/email/i)
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      await user.click(button)

      await waitFor(() => {
        // The success state shows an SVG checkmark
        const svg = document.querySelector('svg')
        expect(svg).toBeInTheDocument()
      })
    })
  })
})

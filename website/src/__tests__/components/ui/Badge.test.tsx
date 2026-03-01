import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge component', () => {
  describe('rendering', () => {
    it('renders with default category', () => {
      render(<Badge>General</Badge>)
      expect(screen.getByText('General')).toBeInTheDocument()
    })

    it('renders sailing category', () => {
      render(<Badge category="sailing">Sailing</Badge>)
      const badge = screen.getByText('Sailing')
      expect(badge).toBeInTheDocument()
    })

    it('renders hunting category', () => {
      render(<Badge category="hunting">Hunting</Badge>)
      expect(screen.getByText('Hunting')).toBeInTheDocument()
    })

    it('renders diving category', () => {
      render(<Badge category="diving">Diving</Badge>)
      expect(screen.getByText('Diving')).toBeInTheDocument()
    })

    it('renders fishing category', () => {
      render(<Badge category="fishing">Fishing</Badge>)
      expect(screen.getByText('Fishing')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has base badge styles', () => {
      render(<Badge>Test</Badge>)
      const badge = screen.getByText('Test')
      expect(badge.className).toContain('uppercase')
      expect(badge.className).toContain('tracking')
    })
  })
})

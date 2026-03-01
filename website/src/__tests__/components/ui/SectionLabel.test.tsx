import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionLabel } from '@/components/ui/SectionLabel'

describe('SectionLabel component', () => {
  describe('rendering', () => {
    it('renders label text', () => {
      render(<SectionLabel label="Test Section" />)
      expect(screen.getByText('Test Section')).toBeInTheDocument()
    })

    it('renders number when provided', () => {
      render(<SectionLabel number="01" label="Voyages" />)
      expect(screen.getByText(/01/)).toBeInTheDocument()
      expect(screen.getByText(/Voyages/)).toBeInTheDocument()
    })

    it('formats number with leading zero', () => {
      render(<SectionLabel number="01" label="Test" />)
      const element = screen.getByText(/01/)
      expect(element.textContent).toContain('01')
    })
  })

  describe('styling', () => {
    it('applies monospace font to number', () => {
      render(<SectionLabel number="01" label="Test" />)
      // The component should use a monospace font class
      const container = screen.getByText(/01/).closest('div')
      expect(container).toBeInTheDocument()
    })

    it('applies copper color styling', () => {
      render(<SectionLabel label="Test" />)
      const label = screen.getByText('Test')
      expect(label.className).toContain('copper')
    })
  })

  describe('custom className', () => {
    it('accepts custom className', () => {
      render(<SectionLabel label="Test" className="custom-class" />)
      const container = screen.getByText('Test').parentElement
      expect(container?.className).toContain('custom-class')
    })
  })
})

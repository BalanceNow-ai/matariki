import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('Input component', () => {
  describe('rendering', () => {
    it('renders input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('renders with label', () => {
      render(<Input label="Email" />)
      expect(screen.getByText('Email')).toBeInTheDocument()
    })

    it('renders label element when label prop is provided', () => {
      render(<Input label="Email" />)
      const label = screen.getByText('Email')
      expect(label.tagName).toBe('LABEL')
    })
  })

  describe('types', () => {
    it('renders with specified type', () => {
      render(<Input type="email" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    })
  })

  describe('error state', () => {
    it('displays error message', () => {
      render(<Input error="This field is required" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('applies error styles when error is present', () => {
      render(<Input error="Error" />)
      const input = screen.getByRole('textbox')
      expect(input.className).toContain('border-warning-red')
    })
  })

  describe('interactions', () => {
    it('calls onChange handler', () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'test' } })

      expect(handleChange).toHaveBeenCalled()
    })

    it('updates value on change', () => {
      const TestComponent = () => {
        const [value, setValue] = vi.fn().mockImplementation((v) => v)
        return <Input value={value} onChange={(e) => setValue(e.target.value)} />
      }

      render(<Input defaultValue="" />)
      const input = screen.getByRole('textbox')

      fireEvent.change(input, { target: { value: 'hello' } })
      expect(input).toHaveValue('hello')
    })
  })

  describe('accessibility', () => {
    it('is focusable', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')

      input.focus()
      expect(input).toHaveFocus()
    })

    it('can be required', () => {
      render(<Input required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })
  })
})

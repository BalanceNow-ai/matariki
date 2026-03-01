import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatCoordinates, calculateReadTime } from '@/lib/utils'

describe('cn (class name utility)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('merges conflicting Tailwind classes correctly', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})

describe('formatDate', () => {
  it('formats date string in NZ locale', () => {
    const result = formatDate('2026-03-01')
    expect(result).toMatch(/1 March 2026/)
  })

  it('formats Date object', () => {
    const date = new Date('2026-12-25')
    const result = formatDate(date)
    expect(result).toMatch(/25 December 2026/)
  })

  it('handles ISO date strings', () => {
    const result = formatDate('2026-01-15T10:30:00Z')
    expect(result).toMatch(/January 2026/)
  })
})

describe('formatCoordinates', () => {
  it('formats positive coordinates (N, E)', () => {
    const result = formatCoordinates(35.7275, 174.3278)
    expect(result).toBe('35.7275° N, 174.3278° E')
  })

  it('formats negative coordinates (S, W)', () => {
    const result = formatCoordinates(-35.7275, -174.3278)
    expect(result).toBe('35.7275° S, 174.3278° W')
  })

  it('formats mixed coordinates', () => {
    const result = formatCoordinates(-35.7275, 174.3278)
    expect(result).toBe('35.7275° S, 174.3278° E')
  })

  it('handles zero coordinates', () => {
    const result = formatCoordinates(0, 0)
    expect(result).toBe('0.0000° N, 0.0000° E')
  })

  it('rounds to 4 decimal places', () => {
    const result = formatCoordinates(35.72751234, 174.32789876)
    expect(result).toBe('35.7275° N, 174.3279° E')
  })
})

describe('calculateReadTime', () => {
  it('calculates read time for short text', () => {
    const text = 'Hello world' // 2 words
    expect(calculateReadTime(text)).toBe(1) // Minimum 1 minute
  })

  it('calculates read time for longer text', () => {
    const words = Array(400).fill('word').join(' ') // 400 words
    expect(calculateReadTime(words)).toBe(2) // 400/200 = 2 minutes
  })

  it('rounds up to next minute', () => {
    const words = Array(201).fill('word').join(' ') // 201 words
    expect(calculateReadTime(words)).toBe(2) // ceil(201/200) = 2
  })

  it('handles empty string', () => {
    expect(calculateReadTime('')).toBe(1)
  })

  it('handles text with extra whitespace', () => {
    const text = '  hello   world  ' // 2 words with extra spaces
    expect(calculateReadTime(text)).toBe(1)
  })
})

import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import React from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}))

// Mock next/image - return a simple object that represents an img element
vi.mock('next/image', () => ({
  default: function MockImage(props: { src: string; alt: string; [key: string]: unknown }) {
    return React.createElement('img', props)
  },
}))

// Mock next/link - return an anchor element
vi.mock('next/link', () => ({
  default: function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return React.createElement('a', { href, ...props }, children)
  },
}))

// Global fetch mock
const originalFetch = global.fetch
beforeEach(() => {
  global.fetch = vi.fn()
})
afterEach(() => {
  global.fetch = originalFetch
  vi.clearAllMocks()
})

import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

beforeAll(() => {
  // Mock window.matchMedia with prefers-reduced-motion: reduce
  // and mobile media query handling
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  })

  // Disable CSS animations and transitions globally in tests so Radix Dialog and Tooltips mount synchronously
  const style = document.createElement('style')
  style.innerHTML = `
    *, *::before, *::after {
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
    }
  `
  document.head.appendChild(style)
})

afterEach(() => {
  cleanup()
})

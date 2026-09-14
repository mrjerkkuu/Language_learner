// Vitest setup: adds jest-dom matchers (toBeInTheDocument, toHaveTextContent, …)
// and auto-cleans the DOM + storage between tests.
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

beforeEach(() => {
  // Component tests share one jsdom; reset per-viewer state between tests.
  if (typeof localStorage !== 'undefined') localStorage.clear()
  if (typeof document !== 'undefined') delete document.documentElement.dataset.theme
})

afterEach(() => cleanup())

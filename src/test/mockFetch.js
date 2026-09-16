import { vi } from 'vitest'

const DEFAULT_CSRF_TOKEN = 'test-csrf-token'

// -----------------------------------------------------------------------------
// mockFetch(routes) — a global `fetch` stand-in for apiClient tests.
// -----------------------------------------------------------------------------
// `routes` maps "METHOD path" to a handler returning { status, body }. A
// GET /api/auth/csrf handler is provided by default (apiClient fetches this
// before every mutating request) — override it if a test needs to.
//
// Usage: vi.stubGlobal('fetch', mockFetch({ 'POST /api/auth/login': () => (...) }))
// -----------------------------------------------------------------------------
export function mockFetch(routes = {}) {
  const allRoutes = {
    'GET /api/auth/csrf': () => ({ status: 200, body: { csrfToken: DEFAULT_CSRF_TOKEN } }),
    ...routes,
  }

  return vi.fn(async (path, options = {}) => {
    const method = options.method ?? 'GET'
    const key = `${method} ${path}`
    const handler = allRoutes[key]
    if (!handler) {
      throw new Error(`mockFetch: no handler registered for ${key}`)
    }

    const requestBody = options.body ? JSON.parse(options.body) : undefined
    const { status, body } = await handler(requestBody, options)

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }
  })
}

export const CSRF_TOKEN = DEFAULT_CSRF_TOKEN

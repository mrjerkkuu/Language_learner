import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, clearCsrfToken } from './apiClient'
import { mockFetch, CSRF_TOKEN } from '../test/mockFetch'

beforeEach(() => {
  clearCsrfToken()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiClient', () => {
  it('GET sends credentials:include and returns {ok,data,status}, without fetching a CSRF token', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me': () => ({ status: 200, body: { user: { id: '1' } } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await apiClient.get('/api/auth/me')

    expect(res).toEqual({ ok: true, data: { user: { id: '1' } }, status: 200 })
    expect(fetchMock).toHaveBeenCalledTimes(1) // no CSRF fetch for a GET
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ credentials: 'include' }))
  })

  it('POST fetches a CSRF token first and sends it in the x-csrf-token header', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/logout': () => ({ status: 200, body: { ok: true } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await apiClient.post('/api/auth/logout')

    expect(res).toEqual({ ok: true, data: { ok: true }, status: 200 })
    const [, options] = fetchMock.mock.calls.find(([path]) => path === '/api/auth/logout')
    expect(options.credentials).toBe('include')
    expect(options.headers['x-csrf-token']).toBe(CSRF_TOKEN)
  })

  it('caches the CSRF token across multiple mutating requests', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/logout': () => ({ status: 200, body: { ok: true } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.post('/api/auth/logout')
    await apiClient.post('/api/auth/logout')

    const csrfCalls = fetchMock.mock.calls.filter(([path]) => path === '/api/auth/csrf')
    expect(csrfCalls).toHaveLength(1)
  })

  it('retries exactly once on a 403 (stale CSRF token), then succeeds with a fresh one', async () => {
    let attempts = 0
    const fetchMock = mockFetch({
      'POST /api/auth/logout': () => {
        attempts += 1
        return attempts === 1
          ? { status: 403, body: { code: 'FST_CSRF_INVALID_TOKEN' } }
          : { status: 200, body: { ok: true } }
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await apiClient.post('/api/auth/logout')

    expect(res).toEqual({ ok: true, data: { ok: true }, status: 200 })
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/csrf')).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/logout')).toHaveLength(2)
  })

  it('does not retry more than once if the fresh token also comes back 403', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/logout': () => ({ status: 403, body: { code: 'FST_CSRF_INVALID_TOKEN' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await apiClient.post('/api/auth/logout')

    expect(res).toEqual({ ok: false, code: 'FST_CSRF_INVALID_TOKEN', status: 403 })
    // Exactly one retry (two attempts total), never an infinite loop.
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/logout')).toHaveLength(2)
  })

  it('clearCsrfToken() forces a fresh token fetch on the next mutating request', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/logout': () => ({ status: 200, body: { ok: true } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.post('/api/auth/logout')
    clearCsrfToken()
    await apiClient.post('/api/auth/logout')

    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/csrf')).toHaveLength(2)
  })

  it('maps a network failure to {ok:false, code:"network", status:0}', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))

    const res = await apiClient.get('/api/auth/me')

    expect(res).toEqual({ ok: false, code: 'network', status: 0 })
  })

  it('maps a 429 to {ok:false, code:"rate_limited"} regardless of the body shape', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/login': () => ({ status: 429, body: { statusCode: 429, message: 'slow down' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await apiClient.post('/api/auth/login', { email: 'a@b.fi', password: 'x' })

    expect(res).toEqual({ ok: false, code: 'rate_limited', status: 429 })
  })

  it("passes through the server's error code for other non-2xx responses", async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/register': () => ({ status: 409, body: { code: 'email_taken' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await apiClient.post('/api/auth/register', { displayName: 'A', email: 'a@b.fi', password: 'x' })

    expect(res).toEqual({ ok: false, code: 'email_taken', status: 409 })
  })
})

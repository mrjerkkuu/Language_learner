import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register, login, logout, me, mapAuthError } from './authService'
import { clearCsrfToken } from './apiClient'
import { mockFetch } from '../test/mockFetch'

beforeEach(() => {
  clearCsrfToken()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authService', () => {
  it('register() returns {ok:true,user} on success', async () => {
    const user = { id: '1', email: 'a@b.fi', displayName: 'A' }
    vi.stubGlobal('fetch', mockFetch({ 'POST /api/auth/register': () => ({ status: 201, body: { user } }) }))

    expect(await register({ displayName: 'A', email: 'a@b.fi', password: 'longenough' })).toEqual({
      ok: true,
      user,
    })
  })

  it('register() returns {ok:false,code,message} on a duplicate email', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ 'POST /api/auth/register': () => ({ status: 409, body: { code: 'email_taken' } }) }),
    )

    expect(await register({ displayName: 'A', email: 'taken@example.com', password: 'longenough' })).toEqual({
      ok: false,
      code: 'email_taken',
      message: 'Tällä sähköpostilla on jo tili. Kirjaudu sisään.',
    })
  })

  it('login() returns {ok:true,user} on success', async () => {
    const user = { id: '1', email: 'a@b.fi', displayName: 'A' }
    vi.stubGlobal('fetch', mockFetch({ 'POST /api/auth/login': () => ({ status: 200, body: { user } }) }))

    expect(await login({ email: 'a@b.fi', password: 'correct' })).toEqual({ ok: true, user })
  })

  it('login() returns the identical bad_credentials error for a wrong password and an unknown email', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ 'POST /api/auth/login': () => ({ status: 401, body: { code: 'bad_credentials' } }) }),
    )

    const wrongPassword = await login({ email: 'a@b.fi', password: 'wrong' })
    const unknownEmail = await login({ email: 'nope@example.com', password: 'wrong' })

    expect(wrongPassword).toEqual({
      ok: false,
      code: 'bad_credentials',
      message: 'Sähköposti tai salasana ei täsmää.',
    })
    expect(unknownEmail).toEqual(wrongPassword)
  })

  it('logout() returns {ok:true} on success and drops the cached CSRF token', async () => {
    const fetchMock = mockFetch({ 'POST /api/auth/logout': () => ({ status: 200, body: { ok: true } }) })
    vi.stubGlobal('fetch', fetchMock)

    expect(await logout()).toEqual({ ok: true })

    // A second mutating call must re-fetch the CSRF token, proving the
    // cached one was cleared by logout().
    await logout()
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/csrf')).toHaveLength(2)
  })

  it('logout() returns {ok:false,code} when the server call fails', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ 'POST /api/auth/logout': () => ({ status: 500, body: { code: 'internal_error' } }) }),
    )

    expect(await logout()).toEqual({ ok: false, code: 'internal_error' })
  })

  it('me() returns the user on a valid session', async () => {
    const user = { id: '1', email: 'a@b.fi', displayName: 'A' }
    vi.stubGlobal('fetch', mockFetch({ 'GET /api/auth/me': () => ({ status: 200, body: { user } }) }))

    expect(await me()).toEqual(user)
  })

  it('me() returns null when there is no session (401)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ 'GET /api/auth/me': () => ({ status: 401, body: { code: 'unauthorized' } }) }),
    )

    expect(await me()).toBeNull()
  })

  it('mapAuthError() covers every known code plus a default fallback for unknown ones', () => {
    expect(mapAuthError('bad_credentials')).toBe('Sähköposti tai salasana ei täsmää.')
    expect(mapAuthError('email_taken')).toBe('Tällä sähköpostilla on jo tili. Kirjaudu sisään.')
    expect(mapAuthError('rate_limited')).toBe('Liian monta yritystä. Odota hetki ja yritä uudelleen.')
    expect(mapAuthError('network')).toBe('Yhteysvirhe. Tarkista yhteys ja yritä uudelleen.')
    expect(mapAuthError('something_unexpected')).toBe('Yhteysvirhe. Tarkista yhteys ja yritä uudelleen.')
  })
})

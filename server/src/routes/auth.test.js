import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { getCsrf, registerUser } from '../test/helpers.js'

const CREDENTIALS = { displayName: 'Testi', email: 'testi@example.com', password: 'correcthorsebatterystaple' }

describe('auth routes', () => {
  let app

  beforeAll(async () => {
    app = await buildApp({ logger: false })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('registers a user, returns it without passwordHash, and sets a session cookie', async () => {
    const { res, cookie } = await registerUser(app, CREDENTIALS)

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user).toEqual({ id: expect.any(String), email: CREDENTIALS.email, displayName: CREDENTIALS.displayName })
    expect(body.user.passwordHash).toBeUndefined()
    expect(cookie).toMatch(/^tr_session=/)
  })

  it('rejects a duplicate email with 409 email_taken', async () => {
    const { csrfToken, cookie } = await getCsrf(app)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { ...CREDENTIALS, displayName: 'Toinen' },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ code: 'email_taken' })
  })

  it('rejects register/login without a CSRF token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: CREDENTIALS.email, password: CREDENTIALS.password },
    })

    expect(res.statusCode).toBe(403)
  })

  it('rejects register/login with an invalid CSRF token', async () => {
    const { cookie } = await getCsrf(app)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { cookie, 'x-csrf-token': 'not-a-real-token' },
      payload: { email: CREDENTIALS.email, password: CREDENTIALS.password },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns the identical bad_credentials response for a wrong password and for an unknown email', async () => {
    const wrongPassword = await (async () => {
      const { csrfToken, cookie } = await getCsrf(app)
      return app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { cookie, 'x-csrf-token': csrfToken },
        payload: { email: CREDENTIALS.email, password: 'wrongpassword' },
      })
    })()

    const unknownEmail = await (async () => {
      const { csrfToken, cookie } = await getCsrf(app)
      return app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { cookie, 'x-csrf-token': csrfToken },
        payload: { email: 'does-not-exist@example.com', password: 'wrongpassword' },
      })
    })()

    expect(wrongPassword.statusCode).toBe(401)
    expect(unknownEmail.statusCode).toBe(401)
    expect(wrongPassword.json()).toEqual({ code: 'bad_credentials' })
    expect(unknownEmail.json()).toEqual(wrongPassword.json())
  })

  it('logs a user in with correct credentials', async () => {
    const { csrfToken, cookie } = await getCsrf(app)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { email: CREDENTIALS.email, password: CREDENTIALS.password },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().user.email).toBe(CREDENTIALS.email)
  })

  it('walks /me through 401 (no session) -> 200 (logged in) -> 401 (after logout)', async () => {
    const loggedOut = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(loggedOut.statusCode).toBe(401)

    const { csrfToken, cookie: csrfCookie } = await getCsrf(app)
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { cookie: csrfCookie, 'x-csrf-token': csrfToken },
      payload: { email: CREDENTIALS.email, password: CREDENTIALS.password },
    })
    const sessionCookie = login.headers['set-cookie'].split(';')[0]

    const loggedIn = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: sessionCookie } })
    expect(loggedIn.statusCode).toBe(200)
    expect(loggedIn.json().user.email).toBe(CREDENTIALS.email)

    const { csrfToken: logoutCsrf } = await getCsrf(app, sessionCookie)
    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: sessionCookie, 'x-csrf-token': logoutCsrf },
    })
    expect(logout.statusCode).toBe(200)

    // A real client (browser/curl) updates its cookie jar from logout's
    // Set-Cookie (which clears the session), so the follow-up request must
    // use that value — not the stale pre-logout cookie. secure-session is
    // stateless/unrevocable by design (see T4 in claude/vaihe-3-suunnitelma.md),
    // so replaying the old cookie would still authenticate; that's a known,
    // deferred limitation, not what this test is checking.
    const clearedCookie = logout.headers['set-cookie'].split(';')[0]
    const afterLogout = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: clearedCookie } })
    expect(afterLogout.statusCode).toBe(401)
  })

  it('rejects a tampered session cookie without crashing the server', async () => {
    const { csrfToken, cookie: csrfCookie } = await getCsrf(app)
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { cookie: csrfCookie, 'x-csrf-token': csrfToken },
      payload: { email: CREDENTIALS.email, password: CREDENTIALS.password },
    })
    const sessionCookie = login.headers['set-cookie'].split(';')[0]

    // Flip a character in the encrypted payload — secure-session must reject
    // this as an integrity failure rather than decoding it into a forged session.
    const tampered = sessionCookie.replace('tr_session=', 'tr_session=X')

    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: tampered } })
    expect(res.statusCode).toBe(401)

    // The app instance must still be responsive afterwards.
    const health = await app.inject({ method: 'GET', url: '/api/health' })
    expect(health.statusCode).toBe(200)
  })

  // TODO (Phase B): once /api/progress and /api/activity exist, add an
  // "only own data" isolation test (user A can never read/write user B's rows).
})

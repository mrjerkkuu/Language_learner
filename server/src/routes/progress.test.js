import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { getCsrf, registerUser, loginUser } from '../test/helpers.js'

const USER_A = { displayName: 'Kortti A', email: 'progress-a@example.com', password: 'correcthorsebatterystaple' }
const USER_B = { displayName: 'Kortti B', email: 'progress-b@example.com', password: 'correcthorsebatterystaple' }

describe('progress routes', () => {
  let app
  let cookieA
  let cookieB

  beforeAll(async () => {
    app = await buildApp({ logger: false })
    await app.ready()
    ;({ cookie: cookieA } = await registerUser(app, USER_A))
    ;({ cookie: cookieB } = await registerUser(app, USER_B))
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects GET /api/progress without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/progress?language=sv' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ code: 'unauthorized' })
  })

  it('returns an empty map for a fresh user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress?language=sv',
      headers: { cookie: cookieA },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ items: {} })
  })

  it('rejects POST /record without a CSRF token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/progress/record',
      headers: { cookie: cookieA },
      payload: { language: 'sv', itemId: 'v001', correct: true },
    })
    expect(res.statusCode).toBe(403)
  })

  it('rejects POST /record without a session', async () => {
    const { csrfToken, cookie } = await getCsrf(app)
    const res = await app.inject({
      method: 'POST',
      url: '/api/progress/record',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { language: 'sv', itemId: 'v001', correct: true },
    })
    expect(res.statusCode).toBe(401)
  })

  // Weight expectations mirror src/lib/srLogic.test.js's applyResult tests
  // for the same inputs (DEFAULT_WEIGHT 2.5 * CORRECT/WRONG_MULTIPLIER) —
  // this only checks the route wires into the shared engine correctly, not
  // the SR math itself (that's srLogic.test.js's job).
  it('records a correct answer (weight 2.5 * 0.6 = 1.5)', async () => {
    const { csrfToken, cookie } = await getCsrf(app, cookieA)
    const res = await app.inject({
      method: 'POST',
      url: '/api/progress/record',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { language: 'sv', itemId: 'v001', correct: true },
    })
    expect(res.statusCode).toBe(200)
    const { item } = res.json()
    expect(item.weight).toBeCloseTo(1.5)
    expect(item.timesCorrect).toBe(1)
    expect(item.timesWrong).toBe(0)
    expect(item.learned).toBe(false)
    expect(typeof item.lastSeen).toBe('number')
  })

  it('records a wrong answer (weight 2.5 * 2 = 5)', async () => {
    const { csrfToken, cookie } = await getCsrf(app, cookieA)
    const res = await app.inject({
      method: 'POST',
      url: '/api/progress/record',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { language: 'sv', itemId: 'v002', correct: false },
    })
    const { item } = res.json()
    expect(item.weight).toBeCloseTo(5)
    expect(item.timesWrong).toBe(1)
  })

  it('upserts on a repeated record for the same item instead of resetting it', async () => {
    const { csrfToken, cookie } = await getCsrf(app, cookieA)
    const res = await app.inject({
      method: 'POST',
      url: '/api/progress/record',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { language: 'sv', itemId: 'v001', correct: true },
    })
    expect(res.json().item.timesCorrect).toBe(2) // second correct answer for v001
  })

  it('GET reflects everything recorded so far for that language', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress?language=sv',
      headers: { cookie: cookieA },
    })
    expect(Object.keys(res.json().items).sort()).toEqual(['v001', 'v002'])
  })

  it('keeps languages isolated from each other', async () => {
    const { csrfToken, cookie } = await getCsrf(app, cookieA)
    await app.inject({
      method: 'POST',
      url: '/api/progress/record',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { language: 'en', itemId: 'v001', correct: true },
    })
    const sv = await app.inject({ method: 'GET', url: '/api/progress?language=sv', headers: { cookie: cookieA } })
    const en = await app.inject({ method: 'GET', url: '/api/progress?language=en', headers: { cookie: cookieA } })
    expect(Object.keys(en.json().items)).toEqual(['v001'])
    // The 'en' write must not have touched sv's v001 (recorded 2x above).
    expect(sv.json().items.v001.timesCorrect).toBe(2)
  })

  it('record-batch upserts multiple items in one call', async () => {
    const { csrfToken, cookie } = await getCsrf(app, cookieB)
    const res = await app.inject({
      method: 'POST',
      url: '/api/progress/record-batch',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: {
        language: 'sv',
        results: [
          { itemId: 'b1', correct: true },
          { itemId: 'b2', correct: false },
        ],
      },
    })
    expect(res.statusCode).toBe(200)
    const { items } = res.json()
    expect(items.b1.weight).toBeCloseTo(1.5)
    expect(items.b2.weight).toBeCloseTo(5)
  })

  // Known flaky: fails intermittently due to a race condition in the shared
  // test.db, observed independently of unrelated changes on 2026-09-18.
  // Pre-existing, not caused by approve-user.js changes. Not fixed here.
  it('a user never sees another user\'s progress ("only own data")', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress?language=sv',
      headers: { cookie: cookieB },
    })
    // User B only ever recorded b1/b2 (above) — never v001/v002, which belong to user A.
    expect(Object.keys(res.json().items).sort()).toEqual(['b1', 'b2'])
  })

  it('progress persists across a fresh login, not tied to one session', async () => {
    const { res: loginRes, cookie: freshCookie } = await loginUser(app, USER_A)
    expect(loginRes.statusCode).toBe(200)
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress?language=sv',
      headers: { cookie: freshCookie },
    })
    expect(res.json().items.v001.timesCorrect).toBe(2)
  })
})

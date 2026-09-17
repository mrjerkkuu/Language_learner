import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { getCsrf, registerUser } from '../test/helpers.js'

const USER = { displayName: 'Aktiivisuus', email: 'activity-a@example.com', password: 'correcthorsebatterystaple' }
const OTHER = { displayName: 'Toinen', email: 'activity-b@example.com', password: 'correcthorsebatterystaple' }

describe('activity routes', () => {
  let app
  let cookie
  let otherCookie

  beforeAll(async () => {
    app = await buildApp({ logger: false })
    await app.ready()
    ;({ cookie } = await registerUser(app, USER))
    ;({ cookie: otherCookie } = await registerUser(app, OTHER))
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects GET /summary without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/activity/summary' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ code: 'unauthorized' })
  })

  it('returns an all-zero summary for a fresh user', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/activity/summary', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      today: 0,
      weekCount: 0,
      activeDaysThisWeek: 0,
      currentStreak: 0,
      bestStreak: 0,
    })
  })

  it('rejects POST /record without a CSRF token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/activity/record',
      headers: { cookie },
      payload: { amount: 1 },
    })
    expect(res.statusCode).toBe(403)
  })

  it('rejects POST /record without a session', async () => {
    const { csrfToken, cookie: anonCookie } = await getCsrf(app)
    const res = await app.inject({
      method: 'POST',
      url: '/api/activity/record',
      headers: { cookie: anonCookie, 'x-csrf-token': csrfToken },
      payload: { amount: 1 },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects an invalid amount (schema validation)', async () => {
    const { csrfToken, cookie: c } = await getCsrf(app, cookie)
    const res = await app.inject({
      method: 'POST',
      url: '/api/activity/record',
      headers: { cookie: c, 'x-csrf-token': csrfToken },
      payload: { amount: 0 }, // below the schema's minimum: 1
    })
    expect(res.statusCode).toBe(400)
  })

  it('increments today\'s count and returns the updated summary', async () => {
    const { csrfToken, cookie: c } = await getCsrf(app, cookie)
    const res = await app.inject({
      method: 'POST',
      url: '/api/activity/record',
      headers: { cookie: c, 'x-csrf-token': csrfToken },
      payload: { amount: 3 },
    })
    expect(res.statusCode).toBe(200)
    const summary = res.json()
    expect(summary.today).toBe(3)
    expect(summary.weekCount).toBe(3)
    expect(summary.activeDaysThisWeek).toBe(1)
    expect(summary.currentStreak).toBe(1)
    expect(summary.bestStreak).toBe(1)
  })

  it('accumulates multiple records on the same day', async () => {
    const { csrfToken, cookie: c } = await getCsrf(app, cookie)
    const res = await app.inject({
      method: 'POST',
      url: '/api/activity/record',
      headers: { cookie: c, 'x-csrf-token': csrfToken },
      payload: { amount: 2 },
    })
    expect(res.json().today).toBe(5) // 3 + 2
  })

  it('keeps each user\'s activity isolated ("only own data")', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/activity/summary',
      headers: { cookie: otherCookie },
    })
    expect(res.json()).toEqual({
      today: 0,
      weekCount: 0,
      activeDaysThisWeek: 0,
      currentStreak: 0,
      bestStreak: 0,
    })
  })
})

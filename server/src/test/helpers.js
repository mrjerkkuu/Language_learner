// Fastify's inject() has no cookie jar, unlike a browser or curl -c/-b, so
// tests thread the Set-Cookie value through manually between requests.

import { prisma } from '../lib/prisma.js'

function cookieValue(response) {
  const setCookie = response.headers['set-cookie']
  if (!setCookie) return null
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie
  return raw.split(';')[0]
}

export async function getCsrf(app, cookie) {
  const res = await app.inject({
    method: 'GET',
    url: '/api/auth/csrf',
    headers: cookie ? { cookie } : {},
  })
  return {
    csrfToken: res.json().csrfToken,
    cookie: cookieValue(res) ?? cookie,
  }
}

export async function approveUser(email) {
  await prisma.user.update({ where: { email }, data: { approved: true } })
}

// For logging back IN with an already-registered, already-approved user
// (registerUser both registers and logs in, so it can't be reused for this).
export async function loginUser(app, { email, password }) {
  const { csrfToken, cookie } = await getCsrf(app)
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { cookie, 'x-csrf-token': csrfToken },
    payload: { email, password },
  })
  return { res, cookie: cookieValue(res) ?? cookie }
}

// Registration alone no longer yields a usable session (accounts start
// unapproved), but most tests just want a logged-in test user without
// caring about the approval gate itself — so this helper still returns the
// pre-gate contract ({ res, cookie } with a real session cookie) by
// approving the account directly and logging in right after. `res` is
// still the raw /register response so callers can assert its own shape.
export async function registerUser(app, { displayName, email, password }) {
  const { csrfToken, cookie } = await getCsrf(app)
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    headers: { cookie, 'x-csrf-token': csrfToken },
    payload: { displayName, email, password },
  })

  await approveUser(email)
  const login = await loginUser(app, { email, password })
  return { res, cookie: login.cookie }
}

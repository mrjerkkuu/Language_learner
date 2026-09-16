// Fastify's inject() has no cookie jar, unlike a browser or curl -c/-b, so
// tests thread the Set-Cookie value through manually between requests.

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

export async function registerUser(app, { displayName, email, password }) {
  const { csrfToken, cookie } = await getCsrf(app)
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    headers: { cookie, 'x-csrf-token': csrfToken },
    payload: { displayName, email, password },
  })
  return { res, cookie: cookieValue(res) ?? cookie }
}

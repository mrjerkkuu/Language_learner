// -----------------------------------------------------------------------------
// apiClient — low-level fetch wrapper shared by every service that talks to
// the backend (authService today, progressService later).
// -----------------------------------------------------------------------------
// Same-origin API (see claude/vaihe-3-suunnitelma.md): credentials:'include'
// on every request, and the CSRF token attached via the `x-csrf-token`
// header on mutating requests — that's the header name
// @fastify/csrf-protection reads (see server/src/routes/auth.js /
// server/node_modules/@fastify/csrf-protection). The token itself is fetched
// once from GET /api/auth/csrf and cached in memory only — never
// localStorage/sessionStorage, same reasoning as the session cookie: nothing
// auth-related should be reachable by an XSS payload.
//
// Return shape, stable for every call:
//   { ok: true, data, status }
//   { ok: false, code, status }
// where `code` comes from the server's `{ code: ... }` error body when
// present, `'rate_limited'` on a 429 regardless of body shape (the rate-limit
// plugin doesn't send a `code` field), and `'network'` for anything that
// never got a response at all (offline, DNS failure, etc.).
// -----------------------------------------------------------------------------

let csrfToken = null

export function clearCsrfToken() {
  csrfToken = null
}

async function fetchCsrfToken() {
  const res = await fetch('/api/auth/csrf', { credentials: 'include' })
  const data = await res.json()
  csrfToken = data.csrfToken
  return csrfToken
}

async function parseBody(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function rawRequest(method, path, body, token) {
  const headers = {}
  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (token) headers['x-csrf-token'] = token

  const res = await fetch(path, { method, credentials: 'include', headers, body: payload })
  return { res, data: await parseBody(res) }
}

function toResult(res, data) {
  if (res.ok) return { ok: true, data, status: res.status }
  if (res.status === 429) return { ok: false, code: 'rate_limited', status: res.status }
  return { ok: false, code: data?.code ?? 'network', status: res.status }
}

async function request(method, path, body) {
  const needsCsrf = method !== 'GET'

  try {
    let token
    if (needsCsrf) token = csrfToken ?? (await fetchCsrfToken())

    let { res, data } = await rawRequest(method, path, body, token)

    // Expired/invalid CSRF token: refresh once and retry — never loop further.
    if (needsCsrf && res.status === 403) {
      token = await fetchCsrfToken()
      ;({ res, data } = await rawRequest(method, path, body, token))
    }

    return toResult(res, data)
  } catch {
    return { ok: false, code: 'network', status: 0 }
  }
}

export const apiClient = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
}

// -----------------------------------------------------------------------------
// authService — single, backend-agnostic interface for ALL authentication.
// -----------------------------------------------------------------------------
// SAME PATTERN AS aiService: this file is the ONLY place that knows how auth
// talks to the outside world — every call goes through apiClient
// (credentials + CSRF handled there), never a bare `fetch`. Screens, forms
// and AuthContext call these exact functions and never need to change when
// the transport underneath does.
//
// Return-value SHAPES are fixed here and must stay stable:
//   register / login -> { ok: true, user } | { ok: false, code, message }
//   me                -> user | null
//   logout            -> { ok: true } | { ok: false, code }
// where `user` is { id, email, displayName }.
//
// `code` is a stable machine key the UI maps to a Finnish message
// (see mapAuthError below), so error copy lives in one place.
// -----------------------------------------------------------------------------

import { apiClient, clearCsrfToken } from './apiClient'

// -----------------------------------------------------------------------------
// register({ displayName, email, password })
// -----------------------------------------------------------------------------
// POST /api/auth/register — server hashes the password (argon2) and, on
// success, has already started the session (cookie set by the response).
export async function register({ displayName, email, password }) {
  const res = await apiClient.post('/api/auth/register', { displayName, email, password })
  if (res.ok) {
    return { ok: true, user: res.data.user }
  }
  return { ok: false, code: res.code, message: mapAuthError(res.code) }
}

// -----------------------------------------------------------------------------
// login({ email, password })
// -----------------------------------------------------------------------------
// POST /api/auth/login. Wrong password and unknown email both come back as
// the same `bad_credentials` — the server never reveals which one it was.
export async function login({ email, password }) {
  const res = await apiClient.post('/api/auth/login', { email, password })
  if (res.ok) {
    return { ok: true, user: res.data.user }
  }
  return { ok: false, code: res.code, message: mapAuthError(res.code) }
}

// -----------------------------------------------------------------------------
// logout()
// -----------------------------------------------------------------------------
// POST /api/auth/logout clears the server-side session cookie; the cached
// CSRF token is invalidated along with it, so drop our copy too. Returns
// whether the server call actually succeeded — the caller decides what to
// do locally if it didn't (see AuthContext.logout).
export async function logout() {
  const res = await apiClient.post('/api/auth/logout')
  clearCsrfToken()
  return res.ok ? { ok: true } : { ok: false, code: res.code }
}

// -----------------------------------------------------------------------------
// me()
// -----------------------------------------------------------------------------
// GET /api/auth/me — the current user, or null (200 -> user, 401 -> null),
// so the app knows on load whether a cookie session is active.
export async function me() {
  const res = await apiClient.get('/api/auth/me')
  return res.ok ? res.data.user : null
}

// -----------------------------------------------------------------------------
// mapAuthError(code) -> Finnish, user-facing message.
// -----------------------------------------------------------------------------
// One home for auth error copy. The screens call this with either a `code`
// from the service or a thrown/network condition, so wording stays consistent.
export function mapAuthError(code) {
  switch (code) {
    case 'bad_credentials':
      return 'Sähköposti tai salasana ei täsmää.'
    case 'email_taken':
      return 'Tällä sähköpostilla on jo tili. Kirjaudu sisään.'
    case 'rate_limited':
      return 'Liian monta yritystä. Odota hetki ja yritä uudelleen.'
    case 'network':
    default:
      return 'Yhteysvirhe. Tarkista yhteys ja yritä uudelleen.'
  }
}

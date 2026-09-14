// -----------------------------------------------------------------------------
// authService — single, backend-agnostic interface for ALL authentication.
// -----------------------------------------------------------------------------
// SAME PATTERN AS aiService: this file is the ONLY place that knows how auth
// talks to the outside world. Today there is no backend, so every function
// returns a simulated result. Tomorrow (Vaihe 3) we swap the bodies for real
// `fetch('/api/auth/...')` calls — the screens, forms and (future) AuthContext
// keep calling these exact functions and never change.
//
// Return-value SHAPES are fixed here and must stay stable across the swap:
//   register / login -> { ok: true, user } | { ok: false, code, message }
//   me                -> user | null
//   logout            -> void
// where `user` is { id, email, displayName }.
//
// `code` is a stable machine key the UI maps to a Finnish message
// (see mapAuthError below), so error copy lives in one place.
// -----------------------------------------------------------------------------

// Simulated network latency so the form's loading state is visible while
// stubbed. Removed/irrelevant once real fetch calls replace these.
const FAKE_LATENCY_MS = 450
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// While there is no server we keep the "logged in" user only in memory, so a
// reload starts logged out. This is intentional for the stub — the real session
// will live in an httpOnly cookie the server sets.
let currentUser = null

// A tiny helper to make a user object from a form's fields.
function makeUser({ email, displayName }) {
  return {
    id: 'demo-' + Math.random().toString(36).slice(2, 10),
    email,
    displayName: displayName || email.split('@')[0],
  }
}

// -----------------------------------------------------------------------------
// register({ displayName, email, password })
// -----------------------------------------------------------------------------
// STUB: pretends to create an account and start a session. The only simulated
// failure is the email "taken@example.com", so the 409 UI path can be seen.
// TODO (Vaihe 3): POST /api/auth/register (argon2 hash server-side); on success
// the server sets the session cookie and returns the user.
export async function register({ displayName, email, password }) {
  await wait(FAKE_LATENCY_MS)
  void password // not used in the stub; never logged or stored
  if (email.trim().toLowerCase() === 'taken@example.com') {
    return { ok: false, code: 'email_taken', message: mapAuthError('email_taken') }
  }
  currentUser = makeUser({ email: email.trim(), displayName })
  return { ok: true, user: currentUser }
}

// -----------------------------------------------------------------------------
// login({ email, password })
// -----------------------------------------------------------------------------
// STUB: any email + a password of length >= 8 "succeeds"; the reserved password
// "wrongpass" simulates bad credentials so the 401 UI path can be seen.
// TODO (Vaihe 3): POST /api/auth/login; server verifies + sets the cookie.
export async function login({ email, password }) {
  await wait(FAKE_LATENCY_MS)
  if (password === 'wrongpass') {
    return { ok: false, code: 'bad_credentials', message: mapAuthError('bad_credentials') }
  }
  currentUser = makeUser({ email: email.trim() })
  return { ok: true, user: currentUser }
}

// -----------------------------------------------------------------------------
// logout()
// -----------------------------------------------------------------------------
// TODO (Vaihe 3): POST /api/auth/logout to clear the server session cookie.
export async function logout() {
  await wait(FAKE_LATENCY_MS)
  currentUser = null
}

// -----------------------------------------------------------------------------
// me()
// -----------------------------------------------------------------------------
// Returns the current user or null. TODO (Vaihe 3): GET /api/auth/me (200 -> user,
// 401 -> null) so the app knows on load whether a cookie session is active.
export async function me() {
  await wait(FAKE_LATENCY_MS)
  return currentUser
}

// -----------------------------------------------------------------------------
// mapAuthError(code) -> Finnish, user-facing message.
// -----------------------------------------------------------------------------
// One home for auth error copy. The screens call this with either a `code` from
// the service or a thrown/network condition, so wording stays consistent.
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

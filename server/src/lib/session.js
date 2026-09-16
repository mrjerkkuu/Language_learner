import { createHash } from 'node:crypto'

// @fastify/secure-session needs a 32-byte key. We only keep one SESSION_SECRET
// string in .env, so derive a deterministic 32-byte key from it via SHA-256
// instead of introducing a second SALT env var.
export function deriveSessionKey(secret) {
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short')
  }
  return createHash('sha256').update(secret).digest()
}

export const sessionOptions = {
  sessionName: 'session',
  cookieName: 'tr_session',
  expiry: 60 * 60 * 24 * 30, // 30 days
  cookie: {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // Fail-safe: secure unless NODE_ENV is explicitly 'development' — an
    // unset/unexpected NODE_ENV must never silently drop the Secure flag.
    secure: process.env.NODE_ENV !== 'development',
  },
}

import argon2 from 'argon2'

export async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password)
  } catch {
    // A malformed/unexpected hash must never throw into a route handler.
    return false
  }
}

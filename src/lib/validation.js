// -----------------------------------------------------------------------------
// Form validation — pure, framework-free helpers.
// -----------------------------------------------------------------------------
// These mirror the rules the backend will enforce (Vaihe 3). They exist ONLY to
// give the user fast, friendly feedback in the form; the server is always the
// real authority. Kept pure (string in -> error string | null out) so they are
// trivially unit-testable and reusable across Login/Register.
//
// Convention: each validator returns a Finnish error message string when the
// value is invalid, or `null` when it's fine.
// -----------------------------------------------------------------------------

// Minimum password length. Keep this in sync with the server rule when it's
// built (a single shared constant can replace both later).
export const PASSWORD_MIN_LENGTH = 8
export const DISPLAY_NAME_MAX_LENGTH = 40

// A deliberately simple email shape check: "something@something.something".
// We do NOT try to fully validate emails in the client (that's famously
// impossible and the server + a real confirmation email are the real check);
// this only catches obvious typos like a missing "@".
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value) {
  const email = (value ?? '').trim()
  if (!email) return 'Anna sähköpostiosoite.'
  if (!EMAIL_RE.test(email)) return 'Tarkista sähköpostiosoitteen muoto.'
  return null
}

export function validatePassword(value) {
  const password = value ?? ''
  if (!password) return 'Anna salasana.'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Salasanassa on oltava vähintään ${PASSWORD_MIN_LENGTH} merkkiä.`
  }
  return null
}

export function validateDisplayName(value) {
  const name = (value ?? '').trim()
  if (!name) return 'Anna näyttönimi.'
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Näyttönimi voi olla enintään ${DISPLAY_NAME_MAX_LENGTH} merkkiä.`
  }
  return null
}

// Validate a whole form at once. `fields` lists which validators to run, so the
// same helper serves both Login (email + password) and Register (all three).
// Returns an object of { fieldName: errorMessage } containing ONLY the fields
// that failed — so `Object.keys(result).length === 0` means the form is valid.
export function validateForm(values, fields) {
  const errors = {}
  if (fields.includes('displayName')) {
    const e = validateDisplayName(values.displayName)
    if (e) errors.displayName = e
  }
  if (fields.includes('email')) {
    const e = validateEmail(values.email)
    if (e) errors.email = e
  }
  if (fields.includes('password')) {
    const e = validatePassword(values.password)
    if (e) errors.password = e
  }
  return errors
}

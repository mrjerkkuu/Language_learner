import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import FormField from '../components/FormField'
import PasswordInput from '../components/PasswordInput'
import { validateForm } from '../lib/validation'
import { login, mapAuthError } from '../services/authService'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// Login (/login)
// -----------------------------------------------------------------------------
// Email + password. Client validation is UX-only; the server is the real check.
// All backend contact goes through authService (a stub today), so this screen
// won't change when the real API is wired in.
//
// Form states: idle -> (submit) validating -> submitting (button spinner +
// inputs locked) -> success (navigate) | error (message above the form).
// -----------------------------------------------------------------------------

export default function Login() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({}) // per-field
  const [formError, setFormError] = useState(null) // top-level (server) error
  const [submitting, setSubmitting] = useState(false)

  const setField = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const fieldErrors = validateForm(values, ['email', 'password'])
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    try {
      const res = await login({ email: values.email, password: values.password })
      if (res.ok) {
        navigate(ROUTES.home) // TODO (Vaihe 3): go to intended route / "/app"
      } else {
        setFormError(res.message)
      }
    } catch {
      setFormError(mapAuthError('network'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell kicker="Tervetuloa takaisin" title="Kirjaudu" backTo={ROUTES.welcome}>
      <form onSubmit={handleSubmit} noValidate className="mt-2">
        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-wrong/40 bg-wrong/10 px-4 py-3 text-sm font-medium text-wrong"
          >
            {formError}
          </div>
        )}

        <FormField
          label="Sähköposti"
          type="email"
          inputMode="email"
          autoComplete="username"
          enterKeyHint="next"
          placeholder="sinun@sähköposti.fi"
          value={values.email}
          onChange={setField('email')}
          error={errors.email}
          disabled={submitting}
        />

        <PasswordInput
          label="Salasana"
          autoComplete="current-password"
          enterKeyHint="go"
          value={values.password}
          onChange={setField('password')}
          error={errors.password}
          disabled={submitting}
        />

        <button
          type="submit"
          disabled={submitting}
          className="touch-target mt-6 w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white active:brightness-95 disabled:opacity-50"
        >
          {submitting ? 'Kirjaudutaan…' : 'Kirjaudu'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Ei tiliä?{' '}
        <Link to={ROUTES.register} className="font-semibold text-accent active:opacity-70">
          Rekisteröidy →
        </Link>
      </p>
    </AuthShell>
  )
}

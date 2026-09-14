import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import FormField from '../components/FormField'
import PasswordInput from '../components/PasswordInput'
import { validateForm, PASSWORD_MIN_LENGTH } from '../lib/validation'
import { register, mapAuthError } from '../services/authService'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// Register (/register)
// -----------------------------------------------------------------------------
// Display name + email + password. Same flow and states as Login; all backend
// contact goes through authService (a stub today). The display name is what the
// app greets the user by ("Hei, Jeremia").
// -----------------------------------------------------------------------------

export default function Register() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ displayName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const setField = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const fieldErrors = validateForm(values, ['displayName', 'email', 'password'])
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    try {
      const res = await register(values)
      if (res.ok) {
        navigate(ROUTES.home) // TODO (Vaihe 3): go to "/app" (and offer demo-progress import)
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
    <AuthShell kicker="Aloita ilmaiseksi" title="Luo tili" backTo={ROUTES.welcome}>
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
          label="Näyttönimi"
          type="text"
          autoComplete="nickname"
          enterKeyHint="next"
          placeholder="Esim. Jeremia"
          value={values.displayName}
          onChange={setField('displayName')}
          error={errors.displayName}
          disabled={submitting}
        />

        <FormField
          label="Sähköposti"
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="next"
          placeholder="sinun@sähköposti.fi"
          value={values.email}
          onChange={setField('email')}
          error={errors.email}
          disabled={submitting}
        />

        <PasswordInput
          label="Salasana"
          autoComplete="new-password"
          enterKeyHint="go"
          hint={`Vähintään ${PASSWORD_MIN_LENGTH} merkkiä.`}
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
          {submitting ? 'Luodaan tiliä…' : 'Luo tili'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Onko jo tili?{' '}
        <Link to={ROUTES.login} className="font-semibold text-accent active:opacity-70">
          Kirjaudu →
        </Link>
      </p>
    </AuthShell>
  )
}

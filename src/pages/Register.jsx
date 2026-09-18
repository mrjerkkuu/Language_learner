import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import FormField from '../components/FormField'
import PasswordInput from '../components/PasswordInput'
import { validateForm, PASSWORD_MIN_LENGTH } from '../lib/validation'
import { mapAuthError } from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// Register (/register)
// -----------------------------------------------------------------------------
// Display name + email + password. Goes through useAuth().register (not
// authService directly) for consistency with Login, even though a
// successful registration does NOT log the visitor in: the new account sits
// pending admin approval, so AuthContext's status stays 'anon' and this
// screen shows a confirmation message instead of navigating to /app.
// -----------------------------------------------------------------------------

export default function Register() {
  const { register, status } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ displayName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [pending, setPending] = useState(false)

  // Already logged in (e.g. back button, or a stale tab): leave this screen.
  useEffect(() => {
    if (status === 'authed') {
      navigate(ROUTES.app, { replace: true })
    }
  }, [status, navigate])

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
        setPending(true)
      } else {
        setFormError(res.message)
      }
    } catch {
      setFormError(mapAuthError('network'))
    } finally {
      setSubmitting(false)
    }
  }

  if (pending) {
    return (
      <AuthShell kicker="Kiitos!" title="Pääsysi odottaa hyväksyntää" backTo={ROUTES.landing}>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Tilisi luotiin onnistuneesti. Ylläpitäjä hyväksyy tilit manuaalisesti — saat
          kirjautua sisään, kun tilisi on hyväksytty.
        </p>
        <Link
          to={ROUTES.login}
          className="touch-target mt-6 flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-base font-semibold text-white active:brightness-95"
        >
          Kirjaudu →
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell kicker="Aloita ilmaiseksi" title="Luo tili" backTo={ROUTES.landing}>
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

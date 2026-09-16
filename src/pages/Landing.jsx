import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// Landing (/)
// -----------------------------------------------------------------------------
// The public entry screen: a short pitch and the three ways in — Register
// (primary), Login (secondary), or "try without an account" (demo, via
// AuthContext's isDemo flag so ProtectedRoute lets the visitor through).
// -----------------------------------------------------------------------------

export default function Landing() {
  const { isDark, toggle } = useTheme()
  const { startDemo } = useAuth()
  const navigate = useNavigate()

  function handleDemo() {
    startDemo()
    navigate(ROUTES.app)
  }

  return (
    <div className="app-safe min-h-screen">
      <main className="animate-page mx-auto flex min-h-screen max-w-md flex-col p-6">
        {/* Theme toggle, top-right (same control as the app menu). */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan'}
            className="touch-target -mr-2 flex items-center justify-center rounded-xl text-ink active:bg-line/60"
          >
            {isDark ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Hero */}
        <div className="mt-6">
          <div className="text-sm text-muted">Kieliharjoittelu</div>
          <h1 className="mt-1.5 font-display text-4xl font-bold leading-tight text-ink">
            Opi työelämän kieltä omaan tahtiisi.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Sanakortit, fraasit, quiz ja kirjoitusharjoitukset — ruotsiksi ja englanniksi.
            Edistymisesi tallentuu tilillesi.
          </p>
        </div>

        {/* Push the actions to the bottom of the viewport. */}
        <div className="flex-1" />

        <div className="space-y-3">
          <Link
            to={ROUTES.register}
            className="touch-target flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-base font-semibold text-white active:brightness-95"
          >
            Rekisteröidy
          </Link>
          <Link
            to={ROUTES.login}
            className="touch-target flex w-full items-center justify-center rounded-xl bg-card py-3.5 text-base font-semibold text-ink ring-1 ring-line active:bg-bg"
          >
            Kirjaudu
          </Link>
        </div>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleDemo}
            className="text-sm font-semibold text-muted active:opacity-70"
          >
            Kokeile ilman tiliä →
          </button>
        </div>
      </main>
    </div>
  )
}

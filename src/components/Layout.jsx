import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------
// Shared page frame: an optional white, sticky top bar + a centered, phone-width
// content column.
//
// Props:
//   - title:    header title (omit for a header-less page, e.g. Home)
//   - back:     show a back chevron
//   - backTo:   where the back chevron points (default: the practice home). A
//               single prop so a routing change only touches ROUTES.
//   - right:    small text on the right of the bar (e.g. a "12 / 42" counter)
//   - progress: 0..1; when set, renders the thin accent progress bar under the bar
// -----------------------------------------------------------------------------

export default function Layout({ title, back = false, backTo = ROUTES.app, right = null, progress = null, children }) {
  const showHeader = Boolean(title) || back
  const { logout } = useAuth()
  const navigate = useNavigate()

  // Navigate away from the protected area FIRST, then clear the session.
  // Doing it in the other order let ProtectedRoute's own guard race us: as
  // soon as logout() flips status to 'anon' while we're still mounted on a
  // protected route, ProtectedRoute re-renders and redirects to /login on
  // its own — which then won the race against our explicit navigate() call
  // here, landing the user on /login instead of the landing page. Leaving
  // first means ProtectedRoute has already unmounted by the time status
  // changes, so it never gets a chance to redirect.
  async function handleLogout() {
    navigate(ROUTES.landing, { replace: true })
    await logout()
  }

  return (
    <div className="app-safe min-h-screen">
      {showHeader && (
        <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
            {back && (
              <Link
                to={backTo}
                aria-label="Takaisin etusivulle"
                className="touch-target -ml-2 flex items-center justify-center rounded-lg text-ink active:bg-line/60"
              >
                {/* Left chevron */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            <h1 className="flex-1 font-display text-lg font-bold text-ink">{title}</h1>
            {right != null && <span className="text-sm font-medium text-muted">{right}</span>}
            <button
              type="button"
              onClick={handleLogout}
              className="touch-target -mr-2 text-sm font-semibold text-muted active:opacity-70"
            >
              Kirjaudu ulos
            </button>
          </div>

          {/* Thin progress bar (4px) under the header. */}
          {progress != null && (
            <div className="h-1 w-full bg-line">
              <div
                className="h-full bg-accent transition-[width] duration-300"
                style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
              />
            </div>
          )}
        </header>
      )}

      <main className="animate-page mx-auto max-w-xl p-4">{children}</main>
    </div>
  )
}

import { Link } from 'react-router-dom'
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
//               single prop so the Vaihe 3 move to /app only changes ROUTES.
//   - right:    small text on the right of the bar (e.g. a "12 / 42" counter)
//   - progress: 0..1; when set, renders the thin accent progress bar under the bar
// -----------------------------------------------------------------------------

export default function Layout({ title, back = false, backTo = ROUTES.home, right = null, progress = null, children }) {
  const showHeader = Boolean(title) || back

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

import { Link } from 'react-router-dom'

// -----------------------------------------------------------------------------
// AuthShell
// -----------------------------------------------------------------------------
// The page frame shared by the auth screens: a phone-width, centered column
// with the app's page-in animation, an optional back link, and a small
// kicker + big display title. Kept separate from the app's Layout because auth
// pages have no app chrome (no module header) and their back link points at the
// landing, not "/".
// -----------------------------------------------------------------------------

export default function AuthShell({ kicker, title, backTo, children }) {
  return (
    <div className="app-safe min-h-screen">
      <main className="animate-page mx-auto flex min-h-screen max-w-md flex-col p-6">
        {backTo && (
          <Link
            to={backTo}
            className="-ml-1 mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted active:opacity-70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Takaisin
          </Link>
        )}

        {kicker && <div className="text-sm text-muted">{kicker}</div>}
        {title && (
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">{title}</h1>
        )}

        {children}
      </main>
    </div>
  )
}

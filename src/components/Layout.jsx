import { Link } from 'react-router-dom'

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------
// Shared page frame: a sticky top header + a centered, phone-width content
// column. On module pages we pass `back` to show a back-to-home chevron.
// -----------------------------------------------------------------------------

export default function Layout({ title, back = false, children }) {
  return (
    <div className="app-safe min-h-screen">
      <header className="sticky top-0 z-20 bg-brand-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-4">
          {back && (
            <Link
              to="/"
              aria-label="Takaisin etusivulle"
              className="touch-target -ml-2 flex items-center justify-center rounded-lg text-white active:bg-white/10"
            >
              {/* Left chevron */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl p-4">{children}</main>
    </div>
  )
}

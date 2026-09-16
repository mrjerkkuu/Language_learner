import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// ProtectedRoute — layout route guarding the practice area.
// -----------------------------------------------------------------------------
// This is UX only, not the real security boundary: every protected /api
// route checks the session server-side regardless of what the client does.
// -----------------------------------------------------------------------------

export default function ProtectedRoute() {
  const { status, isDemo } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Ladataan…</p>
      </div>
    )
  }

  if (status !== 'authed' && !isDemo) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  return <Outlet />
}

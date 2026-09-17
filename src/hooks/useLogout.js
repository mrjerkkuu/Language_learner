import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// useLogout
// -----------------------------------------------------------------------------
// Returns a click-ready logout handler. Extracted from Layout.jsx so the
// logout action can live on Home (the only place it's shown now) without
// duplicating the navigate-then-logout ordering logic below.
// -----------------------------------------------------------------------------

export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return useCallback(async () => {
    // Navigate away from the protected area FIRST, then clear the session.
    // Doing it in the other order let ProtectedRoute's own guard race us: as
    // soon as logout() flips status to 'anon' while we're still mounted on a
    // protected route, ProtectedRoute re-renders and redirects to /login on
    // its own — which then won the race against our explicit navigate() call
    // here, landing the user on /login instead of the landing page. Leaving
    // first means ProtectedRoute has already unmounted by the time status
    // changes, so it never gets a chance to redirect.
    navigate(ROUTES.landing, { replace: true })
    await logout()
  }, [navigate, logout])
}

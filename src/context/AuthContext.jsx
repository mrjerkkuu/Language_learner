import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import * as authService from '../services/authService'
import { progressStore } from '../services/progressStore'

// -----------------------------------------------------------------------------
// AuthContext
// -----------------------------------------------------------------------------
// Same Provider/hook pattern as LanguageContext: a plain context, a Provider
// computing a memoised value, and a useAuth() hook that throws outside it.
//
// `status` starts 'loading' while GET /api/auth/me (via authService.me()) is
// in flight on mount, then settles to 'authed' or 'anon'. login updates
// `user`/`status` synchronously from its own response — no follow-up /me
// call — so a ProtectedRoute render right after a successful submit sees the
// new status immediately. register() does NOT: a new account sits pending
// admin approval and never gets a session, so a successful registration
// leaves `status` at 'anon'.
// -----------------------------------------------------------------------------

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    let cancelled = false
    authService
      .me()
      .then((currentUser) => {
        if (cancelled) return
        setUser(currentUser)
        setStatus(currentUser ? 'authed' : 'anon')
      })
      .catch(() => {
        // A network error here must never leave status stuck on 'loading' —
        // treat it the same as "not logged in" so ProtectedRoute can send
        // the visitor to /login instead of hanging on a loading screen.
        if (cancelled) return
        setUser(null)
        setStatus('anon')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // progressStore is a plain module (not a hook), so it can't call useAuth()
  // itself — push the current auth state into it here DURING render (NOT in
  // a useEffect): a consumer that newly mounts in the very commit where
  // `status` flips (e.g. Home, right as ProtectedRoute stops blocking) runs
  // its own mount effects BEFORE this component's effects — React fires
  // child effects before parent effects within one commit — so an
  // effect-based sync here would still leave progressStore.authState stale
  // ('loading') at the exact moment that child's first load fires. Syncing
  // during render instead guarantees it's up to date before ANY effect in
  // the tree can run.
  //
  // React's own "adjusting state during render" pattern (see the React docs)
  // requires guarding this kind of render-time side effect with a ref
  // comparison, so it only fires when the relevant value actually changed —
  // not unconditionally on every render (e.g. StrictMode's double-render, or
  // a re-render caused by something unrelated to auth).
  const prevAuthRef = useRef()
  const userId = user?.id ?? null
  if (prevAuthRef.current?.status !== status || prevAuthRef.current?.userId !== userId) {
    progressStore.setAuthState({ status, userId })
    prevAuthRef.current = { status, userId }
  }

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials)
    if (res.ok) {
      setUser(res.user)
      setStatus('authed')
      setIsDemo(false)
    }
    return res
  }, [])

  // Registration no longer starts a session — the account sits pending until
  // an admin approves it — so a successful register() must NOT touch
  // user/status here. The visitor stays 'anon' even after a successful
  // submit; only login() (once approved) transitions to 'authed'.
  const register = useCallback(async (fields) => {
    return authService.register(fields)
  }, [])

  const logout = useCallback(async () => {
    const res = await authService.logout()
    // Always clear local state — better to show the visitor as logged out
    // during a failure than to strand them looking authenticated. If the
    // server call itself failed, the session cookie may still be valid
    // server-side; surface that to the caller (future UI can warn about it)
    // instead of silently pretending logout always succeeds.
    setUser(null)
    setStatus('anon')
    // Always drop demo mode too — otherwise, on a shared device, the next
    // visitor would still see the previous user's practice area/progress
    // (isDemo alone is enough for ProtectedRoute to let someone through).
    setIsDemo(false)
    if (!res.ok) {
      console.error('Logout request failed server-side; local session state was cleared anyway.', res.code)
    }
    return res
  }, [])

  // TODO (Vaihe B/C): back this with sessionStorage/demoStore so demo
  // progress survives a reload and can be imported into a real account on
  // register/login. For now it's plain in-memory state, just enough for
  // ProtectedRoute to let a demo visitor through.
  const startDemo = useCallback(() => setIsDemo(true), [])
  const endDemo = useCallback(() => setIsDemo(false), [])

  const value = useMemo(
    () => ({ user, status, isDemo, login, register, logout, startDemo, endDemo }),
    [user, status, isDemo, login, register, logout, startDemo, endDemo],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>')
  return ctx
}

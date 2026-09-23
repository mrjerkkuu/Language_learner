import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from './LanguageContext'
import { useAuth } from './AuthContext'
import { progressStore } from '../services/progressStore'
import { defaultCardState, deriveStatus, computeStats as computeStatsPure, pickNext as pickNextPure } from '../lib/srLogic'
import { buildSession as buildSessionPure } from '../lib/sessionLogic'

// -----------------------------------------------------------------------------
// ProgressContext
// -----------------------------------------------------------------------------
// Same Provider/hook pattern as AuthContext/LanguageContext. This is the ONE
// place that owns the spaced-repetition state for the current language —
// previously useSpacedRepetition created a fresh, independent copy of this
// state (and its own load-on-mount network call) in EVERY component that
// called it. Home alone had two such copies at once (MotivationBar +
// StreakSheet), each re-fetching the same data. Hoisting it into a Provider
// means the whole app shares one load and one in-memory card map.
//
// Persistence and the per-answer weight math still go through progressStore
// (localStorage, or the server for a logged-in user), so this Provider
// doesn't know or care which backend answered.
// -----------------------------------------------------------------------------

const ProgressContext = createContext(null)

const LEARNED_SHOW_EVERY = 10

export function ProgressProvider({ children }) {
  const { lang } = useLanguage()
  // `status`/`user` are needed so the load effect below can re-run once auth
  // actually resolves — see the dependency array comment.
  const { status, user } = useAuth()
  const [data, setDataState] = useState({})
  const [ready, setReady] = useState(false)
  const pickCounter = useRef(0)

  // Runs on mount with `status` still 'loading' (progressStore.isAuthed()
  // is unavoidably false at that point — GET /api/auth/me hasn't resolved
  // yet), so it would otherwise ALWAYS load from localStorage on first
  // paint, even for a logged-in user, and nothing would ever correct it:
  // this effect's old dependency array was [lang] only, so it never re-ran
  // once auth settled. Depending on `status`/`user?.id` too makes it re-run
  // the moment AuthContext's own effect resolves 'loading' -> 'authed' (or
  // 'anon'), this time with progressStore.isAuthed() reporting correctly.
  useEffect(() => {
    let cancelled = false
    setReady(false)
    progressStore.loadSpacedRepetition(lang).then((loaded) => {
      if (cancelled) return
      setDataState(loaded)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [lang, status, user?.id])

  // Update in-memory state AND persist through the store. Accepts a value or a
  // functional updater, mirroring setState. Used by resetProgress; per-answer
  // updates go through recordResult instead, which already persists via
  // progressStore.recordSpacedRepetition.
  //
  // `next` is computed BEFORE calling setDataState, and the persistence side
  // effect (saveSpacedRepetition) runs as its own statement afterwards — never
  // inside the setDataState updater itself. React may invoke an updater
  // function more than once for one state change (e.g. Strict Mode's dev-only
  // double-invoke), so a side effect placed inside one can run more times
  // than intended (see PhraseBank.jsx's logActivity-in-updater bug, which hit
  // this for real: it double-posted to the server on every reveal).
  const setData = useCallback(
    (value) => {
      const next = typeof value === 'function' ? value(data) : value
      setDataState(next)
      progressStore.saveSpacedRepetition(lang, next)
    },
    [data, lang],
  )

  const getState = useCallback((id) => data[id] ?? defaultCardState(), [data])

  const getStatus = useCallback((id) => deriveStatus(data[id]), [data])

  // Delegates the actual weight math to progressStore: server-side when
  // authed (single source of truth), local srLogic.applyResult as a fallback
  // otherwise. Only the resulting card is applied to local state here.
  const recordResult = useCallback(
    async (id, correct) => {
      const updated = await progressStore.recordSpacedRepetition(lang, id, correct, data[id])
      setDataState((prev) => ({ ...prev, [id]: updated }))
    },
    [data, lang],
  )

  // Quiz uses the same correct/wrong mechanism (kept as a named alias).
  const recordQuiz = recordResult

  const pickNext = useCallback(
    (items, excludeId = null) => {
      pickCounter.current += 1
      const includeLearned = pickCounter.current % LEARNED_SHOW_EVERY === 0
      return pickNextPure(data, items, { excludeId, includeLearned })
    },
    [data],
  )

  const computeStats = useCallback((items) => computeStatsPure(data, items), [data])

  const buildSession = useCallback((items, size) => buildSessionPure(data, items, { size }), [data])

  const resetProgress = useCallback(() => setData({}), [setData])

  const value = useMemo(
    () => ({
      getState,
      getStatus,
      recordResult,
      recordQuiz,
      pickNext,
      computeStats,
      buildSession,
      resetProgress,
      ready,
    }),
    [getState, getStatus, recordResult, recordQuiz, pickNext, computeStats, buildSession, resetProgress, ready],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside a <ProgressProvider>')
  return ctx
}

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { progressStore } from '../services/progressStore'

// -----------------------------------------------------------------------------
// ActivityContext
// -----------------------------------------------------------------------------
// Same Provider/hook pattern as AuthContext/LanguageContext. This is the ONE
// place that owns the activity summary — previously useActivityLog created a
// fresh, independent copy of this state (and its own load-on-mount network
// call) in EVERY component that called it (Home + MotivationBar + StreakSheet
// all at once on the home screen). Hoisting it into a Provider means the
// whole app shares one load and one summary.
//
// progressStore always resolves to the same computed shape — { today,
// weekCount, activeDaysThisWeek, currentStreak, bestStreak } — whether it
// came from the server or was derived locally (see progressStore.js), so
// this Provider just holds that summary in state; it never sees or reasons
// about the raw session log.
// -----------------------------------------------------------------------------

const ActivityContext = createContext(null)

const EMPTY_SUMMARY = { today: 0, weekCount: 0, activeDaysThisWeek: 0, currentStreak: 0, bestStreak: 0 }

export function ActivityProvider({ children }) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    progressStore.loadActivity().then((loaded) => {
      if (cancelled) return
      setSummary(loaded)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Updates state immediately (so the UI reflects the rep right away), then
  // fires the real record call and reconciles with its authoritative summary
  // once it resolves — a streak/week rollover can only be known there, not
  // from `amount` alone.
  const logActivity = useCallback((amount = 1) => {
    setSummary((prev) => ({ ...prev, today: prev.today + amount, weekCount: prev.weekCount + amount }))
    progressStore.recordActivity(amount).then(setSummary)
  }, [])

  const getSummary = useCallback(() => summary, [summary])

  const value = useMemo(() => ({ logActivity, getSummary, ready }), [logActivity, getSummary, ready])

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used inside an <ActivityProvider>')
  return ctx
}

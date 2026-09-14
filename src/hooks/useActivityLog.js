import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { addActivity, summarize } from '../lib/activityLogic'

// -----------------------------------------------------------------------------
// useActivityLog
// -----------------------------------------------------------------------------
// React wrapper around ../lib/activityLogic. Stores the per-day log and exposes
// a logger + a compact summary (today / this week / streaks). The logic and its
// tests live in activityLogic.
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'activity-log-v1'

export function useActivityLog() {
  const [log, setLog] = useLocalStorage(STORAGE_KEY, { sessions: [] })

  const logActivity = useCallback((amount = 1) => setLog((prev) => addActivity(prev, amount)), [setLog])

  const getSummary = useCallback(() => summarize(log), [log])

  return { logActivity, getSummary }
}

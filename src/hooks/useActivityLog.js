import { useCallback, useState } from 'react'
import { progressStore } from '../services/progressStore'
import { addActivity, summarize } from '../lib/activityLogic'

// -----------------------------------------------------------------------------
// useActivityLog
// -----------------------------------------------------------------------------
// React wrapper around ../lib/activityLogic. Exposes a logger + a compact
// summary (today / this week / streaks). The logic and its tests live in
// activityLogic; persistence goes through progressStore (localStorage today,
// server in Vaihe 3) so this hook won't change when the backend lands.
// -----------------------------------------------------------------------------

export function useActivityLog() {
  const [log, setLogState] = useState(() => progressStore.loadActivity())

  // Update in-memory state AND persist through the store.
  const setLog = useCallback((updater) => {
    setLogState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      progressStore.saveActivity(next)
      return next
    })
  }, [])

  const logActivity = useCallback((amount = 1) => setLog((prev) => addActivity(prev, amount)), [setLog])

  const getSummary = useCallback(() => summarize(log), [log])

  return { logActivity, getSummary }
}

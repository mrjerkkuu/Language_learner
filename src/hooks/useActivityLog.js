import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

// -----------------------------------------------------------------------------
// useActivityLog
// -----------------------------------------------------------------------------
// Tracks how actively the app is used. We store a FULL per-day log (so richer
// views can be added later) but the UI only shows a short summary — e.g.
// "Harjoiteltu tänään: 12 sanaa" or "Harjoiteltu 5 kertaa tällä viikolla".
//
// Stored shape:
//   { sessions: [ { date: '2026-09-14', count: 12 }, ... ] }
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'activity-log-v1'

// Local date as YYYY-MM-DD (not UTC), so "today" matches the user's calendar.
function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useActivityLog() {
  const [log, setLog] = useLocalStorage(STORAGE_KEY, { sessions: [] })

  // Record `amount` practiced items for today (default 1). Called by modules
  // whenever the user answers/reviews something.
  const logActivity = useCallback(
    (amount = 1) => {
      const key = todayKey()
      setLog((prev) => {
        const sessions = prev.sessions ? [...prev.sessions] : []
        const idx = sessions.findIndex((s) => s.date === key)
        if (idx >= 0) {
          // Increment today's existing entry.
          sessions[idx] = { ...sessions[idx], count: sessions[idx].count + amount }
        } else {
          // First activity today.
          sessions.push({ date: key, count: amount })
        }
        return { ...prev, sessions }
      })
    },
    [setLog],
  )

  // Compact summary derived from the last 7 days (including today).
  const getSummary = useCallback(() => {
    const sessions = log.sessions ?? []
    const now = new Date()
    const key = todayKey(now)

    // Build the set of the last 7 date keys for a quick membership test.
    const last7Keys = new Set()
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      last7Keys.add(todayKey(d))
    }

    const todayCount = sessions.find((s) => s.date === key)?.count ?? 0
    const week = sessions.filter((s) => last7Keys.has(s.date))
    const weekCount = week.reduce((sum, s) => sum + s.count, 0)
    const activeDaysThisWeek = week.length // how many distinct days had activity

    return { todayCount, weekCount, activeDaysThisWeek }
  }, [log])

  return { logActivity, getSummary }
}

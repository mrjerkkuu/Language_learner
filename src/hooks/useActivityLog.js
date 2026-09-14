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

    // --- Streaks ("putki") ---
    // A day counts toward the streak if it has any activity. The current streak
    // counts consecutive days ending today (or yesterday, so the streak still
    // shows during today before you've practised yet).
    const activeSet = new Set(sessions.map((s) => s.date))
    let currentStreak = 0
    const cursor = new Date(now)
    if (!activeSet.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (activeSet.has(todayKey(cursor))) {
      currentStreak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    // Best streak: the longest run of consecutive active days in all history.
    const dates = [...activeSet].sort()
    let bestStreak = 0
    let run = 0
    let prev = null
    for (const ds of dates) {
      const d = new Date(ds)
      run = prev && d - prev === 86400000 ? run + 1 : 1
      bestStreak = Math.max(bestStreak, run)
      prev = d
    }

    return { todayCount, weekCount, activeDaysThisWeek, currentStreak, bestStreak }
  }, [log])

  return { logActivity, getSummary }
}

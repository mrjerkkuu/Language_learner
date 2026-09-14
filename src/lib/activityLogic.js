// -----------------------------------------------------------------------------
// activityLogic — pure activity-log + streak logic (no React, no storage).
// -----------------------------------------------------------------------------
// Log shape: { sessions: [ { date: 'YYYY-MM-DD', count: number }, ... ] }
// -----------------------------------------------------------------------------

// Local date as YYYY-MM-DD (not UTC), so "today" matches the user's calendar.
export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Add `amount` to today's entry, returning a NEW log object.
export function addActivity(log, amount = 1, now = new Date()) {
  const key = todayKey(now)
  const sessions = log?.sessions ? [...log.sessions] : []
  const idx = sessions.findIndex((s) => s.date === key)
  if (idx >= 0) sessions[idx] = { ...sessions[idx], count: sessions[idx].count + amount }
  else sessions.push({ date: key, count: amount })
  return { ...log, sessions }
}

// Derive today's count, this week's totals, and the current/best streak.
export function summarize(log, now = new Date()) {
  const sessions = log?.sessions ?? []
  const key = todayKey(now)

  // Last 7 day-keys (including today) for the weekly totals.
  const last7 = new Set()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    last7.add(todayKey(d))
  }

  const todayCount = sessions.find((s) => s.date === key)?.count ?? 0
  const week = sessions.filter((s) => last7.has(s.date))
  const weekCount = week.reduce((sum, s) => sum + s.count, 0)
  const activeDaysThisWeek = week.length

  // Streaks: a day counts if it has any activity. Current streak counts
  // consecutive days ending today (or yesterday, so it still shows during today
  // before you've practised).
  const activeSet = new Set(sessions.map((s) => s.date))
  let currentStreak = 0
  const cursor = new Date(now)
  if (!activeSet.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (activeSet.has(todayKey(cursor))) {
    currentStreak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  // Best streak: longest run of consecutive active days in all history.
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
}

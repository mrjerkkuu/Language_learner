import { describe, it, expect } from 'vitest'
import { todayKey, addActivity, summarize } from './activityLogic'

const now = new Date(2026, 8, 14, 12, 0, 0) // 14 Sep 2026, local noon
const offset = (delta) => {
  const d = new Date(now)
  d.setDate(now.getDate() + delta)
  return todayKey(d)
}

describe('addActivity', () => {
  it('creates today entry when empty', () => {
    const log = addActivity({ sessions: [] }, 1, now)
    expect(log.sessions).toEqual([{ date: todayKey(now), count: 1 }])
  })
  it('increments an existing today entry', () => {
    let log = addActivity({ sessions: [] }, 2, now)
    log = addActivity(log, 3, now)
    expect(log.sessions).toHaveLength(1)
    expect(log.sessions[0].count).toBe(5)
  })
})

describe('summarize', () => {
  it('computes today + this-week totals and excludes older days', () => {
    const sessions = [
      { date: offset(0), count: 5 },
      { date: offset(-1), count: 3 },
      { date: offset(-8), count: 100 }, // older than a week -> excluded
    ]
    const s = summarize({ sessions }, now)
    expect(s.todayCount).toBe(5)
    expect(s.weekCount).toBe(8)
    expect(s.activeDaysThisWeek).toBe(2)
  })

  it('current streak counts consecutive days ending today', () => {
    const sessions = [0, -1, -2].map((d) => ({ date: offset(d), count: 1 }))
    const s = summarize({ sessions }, now)
    expect(s.currentStreak).toBe(3)
    expect(s.bestStreak).toBe(3)
  })

  it('counts the streak from yesterday when today has no activity yet', () => {
    const sessions = [-1, -2].map((d) => ({ date: offset(d), count: 1 }))
    expect(summarize({ sessions }, now).currentStreak).toBe(2)
  })

  it('best streak finds the longest run across history', () => {
    // runs: (-10,-9,-8)=3, (-3)=1, (-1,0)=2
    const sessions = [-10, -9, -8, -3, -1, 0].map((d) => ({ date: offset(d), count: 1 }))
    const s = summarize({ sessions }, now)
    expect(s.bestStreak).toBe(3)
    expect(s.currentStreak).toBe(2)
  })

  it('handles an empty log', () => {
    const s = summarize({ sessions: [] }, now)
    expect(s).toEqual({ todayCount: 0, weekCount: 0, activeDaysThisWeek: 0, currentStreak: 0, bestStreak: 0 })
  })
})

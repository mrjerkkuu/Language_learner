import { describe, it, expect } from 'vitest'
import { SESSION, buildSession } from './sessionLogic'
import { SR } from './srLogic'

const NOW = 1_000_000_000

// Build N items with a given id prefix.
const items = (prefix, n) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }))

// dataMap entries for each bucket kind.
const mainCard = (weight = 5, lastSeen = NOW - SR.RECENT_MS - 1) => ({
  weight,
  lastSeen,
  timesCorrect: 1,
  timesWrong: 3,
  learned: false,
})
const easyCard = (lastSeen = NOW - SR.RECENT_MS - 1) => ({
  weight: 1,
  lastSeen,
  timesCorrect: 5,
  timesWrong: 0,
  learned: true,
})
const newCard = () => ({ weight: 2.5, lastSeen: 0, timesCorrect: 0, timesWrong: 0, learned: false })

function dataMapFor(mainItems, easyItems, newItems, { mainLastSeen, easyLastSeen } = {}) {
  const data = {}
  for (const it of mainItems) data[it.id] = mainCard(5, mainLastSeen)
  for (const it of easyItems) data[it.id] = easyCard(easyLastSeen)
  for (const it of newItems) data[it.id] = newCard()
  return data
}

describe('buildSession', () => {
  it('returns SESSION.SIZE items, split across main/easy/new quotas when all buckets are plentiful', () => {
    const mainItems = items('m', 50)
    const easyItems = items('e', 50)
    const newItems = items('n', 50)
    const data = dataMapFor(mainItems, easyItems, newItems)
    const pool = [...mainItems, ...easyItems, ...newItems]

    const session = buildSession(data, pool, { now: NOW, random: () => 0 })

    expect(session).toHaveLength(SESSION.SIZE)
    const byBucket = (prefix) => session.filter((c) => c.id.startsWith(prefix)).length
    expect(byBucket('m')).toBe(SESSION.MAIN_TARGET) // 16
    expect(byBucket('e')).toBe(SESSION.EASY_TARGET) // 2
    expect(byBucket('n')).toBe(SESSION.NEW_TARGET) // 2
  })

  it('never returns a duplicate id', () => {
    const mainItems = items('m', 50)
    const easyItems = items('e', 50)
    const newItems = items('n', 50)
    const data = dataMapFor(mainItems, easyItems, newItems)
    const pool = [...mainItems, ...easyItems, ...newItems]

    const session = buildSession(data, pool, { now: NOW })
    expect(new Set(session.map((c) => c.id)).size).toBe(session.length)
  })

  it('grows the new-card share to absorb a main/easy deficit, still reaching SESSION.SIZE', () => {
    const mainItems = items('m', 5) // deficit 11
    const easyItems = items('e', 1) // deficit 1
    const newItems = items('n', 100) // plenty
    const data = dataMapFor(mainItems, easyItems, newItems)
    const pool = [...mainItems, ...easyItems, ...newItems]

    const session = buildSession(data, pool, { now: NOW, random: () => 0 })

    expect(session).toHaveLength(SESSION.SIZE)
    const byBucket = (prefix) => session.filter((c) => c.id.startsWith(prefix)).length
    expect(byBucket('m')).toBe(5) // took everything available
    expect(byBucket('e')).toBe(1) // took everything available
    expect(byBucket('n')).toBe(14) // 2 + 11 + 1 deficit
  })

  it('returns the whole pool (no padding) when the total available is under SESSION.SIZE', () => {
    const mainItems = items('m', 5)
    const easyItems = items('e', 1)
    const newItems = items('n', 2)
    const data = dataMapFor(mainItems, easyItems, newItems)
    const pool = [...mainItems, ...easyItems, ...newItems]

    const session = buildSession(data, pool, { now: NOW, random: () => 0 })

    expect(session).toHaveLength(8)
    expect(new Set(session.map((c) => c.id))).toEqual(new Set(pool.map((c) => c.id)))
  })

  it('returns an empty array for an empty pool', () => {
    expect(buildSession({}, [], { now: NOW })).toEqual([])
  })

  it('works when the easy and new buckets are empty', () => {
    const mainItems = items('m', 30)
    const data = dataMapFor(mainItems, [], [])
    const session = buildSession(data, mainItems, { now: NOW, random: () => 0 })
    expect(session).toHaveLength(SESSION.SIZE)
    expect(session.every((c) => c.id.startsWith('m'))).toBe(true)
  })

  it('excludes recently-seen main/easy cards (RECENT_MS), same rule as pickNext', () => {
    const recentMain = items('mr', 10)
    const oldMain = items('mo', 30)
    const data = dataMapFor(oldMain, [], [], { mainLastSeen: NOW - SR.RECENT_MS - 1 })
    for (const it of recentMain) data[it.id] = mainCard(5, NOW - 1000) // seen 1s ago
    const pool = [...recentMain, ...oldMain]

    const session = buildSession(data, pool, { now: NOW, random: () => 0 })

    // Enough non-recent candidates exist, so recent ones should be excluded.
    expect(session.some((c) => c.id.startsWith('mr'))).toBe(false)
  })

  it('falls back to recently-seen main cards when filtering them out would empty the bucket', () => {
    const onlyRecentMain = items('m', 3)
    const data = dataMapFor(onlyRecentMain, [], [], { mainLastSeen: NOW - 1000 }) // all "recent"

    const session = buildSession(data, onlyRecentMain, { now: NOW, random: () => 0 })

    // No non-recent candidates exist at all, so the fallback keeps them.
    expect(session).toHaveLength(3)
  })
})

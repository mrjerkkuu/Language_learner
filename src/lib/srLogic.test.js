import { describe, it, expect } from 'vitest'
import {
  SR,
  defaultCardState,
  clampWeight,
  computeLearned,
  applyResult,
  deriveStatus,
  computeStats,
  pickNext,
} from './srLogic'

describe('applyResult', () => {
  it('lowers weight and counts a correct answer', () => {
    const c = applyResult(undefined, true, 1000)
    expect(c.weight).toBeCloseTo(SR.DEFAULT_WEIGHT * SR.CORRECT_MULTIPLIER) // 2.5 * 0.6 = 1.5
    expect(c.timesCorrect).toBe(1)
    expect(c.timesWrong).toBe(0)
    expect(c.lastSeen).toBe(1000)
  })

  it('raises weight and counts a wrong answer', () => {
    const c = applyResult(undefined, false, 1000)
    expect(c.weight).toBeCloseTo(SR.DEFAULT_WEIGHT * SR.WRONG_MULTIPLIER) // 2.5 * 2 = 5
    expect(c.timesWrong).toBe(1)
  })

  it('clamps weight within [MIN, MAX]', () => {
    let c = defaultCardState()
    for (let i = 0; i < 10; i++) c = applyResult(c, true) // keep answering right
    expect(c.weight).toBe(SR.MIN_WEIGHT)
    c = defaultCardState()
    for (let i = 0; i < 10; i++) c = applyResult(c, false) // keep answering wrong
    expect(c.weight).toBe(SR.MAX_WEIGHT)
  })

  it('marks a card learned after enough correct answers, and regresses on a wrong one', () => {
    let c = defaultCardState()
    c = applyResult(c, true) // w 1.5, correct 1
    c = applyResult(c, true) // w 0.9->clamp 1, correct 2
    c = applyResult(c, true) // w 1, correct 3 -> learned (>=3 correct, weight<=1.5)
    expect(c.learned).toBe(true)
    expect(deriveStatus(c)).toBe('learned')
    const after = applyResult(c, false) // wrong -> weight up -> no longer learned
    expect(after.learned).toBe(false)
  })
})

describe('clampWeight / computeLearned', () => {
  it('clamps', () => {
    expect(clampWeight(0.1)).toBe(SR.MIN_WEIGHT)
    expect(clampWeight(999)).toBe(SR.MAX_WEIGHT)
    expect(clampWeight(3)).toBe(3)
  })
  it('learned needs both enough correct AND low weight', () => {
    expect(computeLearned({ timesCorrect: 3, weight: 1.5 })).toBe(true)
    expect(computeLearned({ timesCorrect: 2, weight: 1 })).toBe(false)
    expect(computeLearned({ timesCorrect: 5, weight: 2 })).toBe(false)
  })
})

describe('deriveStatus', () => {
  it('handles new / inProgress / learned', () => {
    expect(deriveStatus(undefined)).toBe('new')
    expect(deriveStatus({ lastSeen: 0 })).toBe('new')
    expect(deriveStatus({ lastSeen: 5, learned: false })).toBe('inProgress')
    expect(deriveStatus({ lastSeen: 5, learned: true })).toBe('learned')
  })
})

describe('computeStats', () => {
  it('counts new / learned / inProgress / difficult', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const data = {
      a: { lastSeen: 0, weight: 2.5, learned: false }, // new (unseen)
      b: { lastSeen: 5, weight: 1, learned: true }, // learned, not difficult
      c: { lastSeen: 5, weight: 5, learned: false }, // inProgress + difficult
      // d: absent -> new
    }
    const s = computeStats(data, items)
    expect(s).toEqual({ total: 4, new: 2, learned: 1, inProgress: 1, difficult: 1 })
  })
})

describe('pickNext', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('returns null for empty input', () => {
    expect(pickNext({}, [])).toBeNull()
  })

  it('excludes excludeId', () => {
    const picked = pickNext({}, items, { excludeId: 'a', now: 1e12, random: () => 0 })
    expect(picked.id).not.toBe('a')
  })

  it('excludes learned cards unless includeLearned', () => {
    const data = { a: { lastSeen: 5, weight: 1, learned: true } }
    const picked = pickNext(data, items, { now: 1e12, random: () => 0 })
    expect(picked.id).not.toBe('a')
  })

  it('weighted draw is deterministic with injected random', () => {
    // all unseen (lastSeen 0) so all eligible; random()=>0 picks the first
    const picked = pickNext({}, items, { now: 1e12, random: () => 0 })
    expect(picked.id).toBe('a')
  })

  it('falls back to least-recently-seen when everything was seen recently', () => {
    const now = 1_000_000
    const data = {
      a: { lastSeen: now - 10_000, weight: 2.5 },
      b: { lastSeen: now - 20_000, weight: 2.5 }, // oldest
      c: { lastSeen: now - 5_000, weight: 2.5 },
    }
    const picked = pickNext(data, items, { now, random: () => 0 })
    expect(picked.id).toBe('b')
  })
})

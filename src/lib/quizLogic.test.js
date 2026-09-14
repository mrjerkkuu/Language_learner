import { describe, it, expect } from 'vitest'
import { distractorsFrom, weightedSample } from './quizLogic'

const pool = [
  { id: '1', term: 'a', category: 'x', part: 1 },
  { id: '2', term: 'b', category: 'x', part: 1 },
  { id: '3', term: 'c', category: 'x', part: 1 },
  { id: '4', term: 'd', category: 'x', part: 1 },
  { id: '5', term: 'e', category: 'y', part: 2 },
]

describe('distractorsFrom', () => {
  it('returns optionCount-1 unique options, excluding the correct one', () => {
    const d = distractorsFrom(pool, pool[0], (x) => x.term, 4)
    expect(d).toHaveLength(3)
    expect(new Set(d).size).toBe(3)
    expect(d).not.toContain('a')
  })

  it('prefers the same category+part', () => {
    const d = distractorsFrom(pool, pool[0], (x) => x.term, 4)
    // siblings b,c,d are all category x / part 1; 'e' (y/2) should not be needed
    expect(d.every((t) => ['b', 'c', 'd'].includes(t))).toBe(true)
  })

  it('widens beyond the same category+part when there are not enough', () => {
    const small = [
      { id: '1', term: 'a', category: 'x', part: 1 },
      { id: '2', term: 'b', category: 'x', part: 1 },
      { id: '3', term: 'c', category: 'y', part: 2 },
      { id: '4', term: 'd', category: 'z', part: 3 },
    ]
    const d = distractorsFrom(small, small[0], (x) => x.term, 4)
    expect(d).toHaveLength(3)
    expect(d).toContain('b') // same cat+part still comes first
  })
})

describe('weightedSample', () => {
  it('returns min(n, len) distinct items', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const s = weightedSample(items, 2, () => 1, () => 0)
    expect(s).toHaveLength(2)
    expect(new Set(s.map((x) => x.id)).size).toBe(2)
  })

  it('never exceeds the pool size', () => {
    const items = [{ id: 'a' }, { id: 'b' }]
    expect(weightedSample(items, 10, () => 1, () => 0)).toHaveLength(2)
  })
})

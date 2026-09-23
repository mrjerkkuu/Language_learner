import { describe, it, expect } from 'vitest'
import { wordFormItems } from './wordFormItems'

describe('wordFormItems', () => {
  it('returns an empty list when a language has no word forms', () => {
    expect(wordFormItems(null)).toEqual([])
    expect(wordFormItems(undefined)).toEqual([])
  })

  it('joins verbs and nouns', () => {
    const data = { source: {}, verbs: [{ id: 'v' }], nouns: [{ id: 'n' }] }
    expect(wordFormItems(data)).toEqual([{ id: 'v' }, { id: 'n' }])
  })

  it('passes a legacy array through unchanged', () => {
    const legacy = [{ id: 'wf-1' }]
    expect(wordFormItems(legacy)).toBe(legacy)
  })
})

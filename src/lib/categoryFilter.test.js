import { describe, it, expect } from 'vitest'
import { categoriesForPart } from './categoryFilter'

const allCategories = [
  { id: 'smaprat', label: 'Rupattelu' },
  { id: 'opiskelu', label: 'Opiskelu' },
  { id: 'ict', label: 'ICT' },
]

const items = [
  { id: '1', part: 1, category: 'smaprat' },
  { id: '2', part: 1, category: 'opiskelu' },
  { id: '3', part: 3, category: 'ict' },
]

describe('categoriesForPart', () => {
  it('returns every category unfiltered when part is "all"', () => {
    expect(categoriesForPart(items, 'all', allCategories)).toEqual(allCategories)
  })

  it('keeps only categories used by items with that part', () => {
    const result = categoriesForPart(items, 1, allCategories)
    expect(result.map((c) => c.id)).toEqual(['smaprat', 'opiskelu'])
  })

  it('excludes a category that only appears in a different part', () => {
    const result = categoriesForPart(items, 1, allCategories)
    expect(result.find((c) => c.id === 'ict')).toBeUndefined()
  })

  it('returns an empty list when no item matches that part', () => {
    expect(categoriesForPart(items, 2, allCategories)).toEqual([])
  })

  it('preserves the canonical order from allCategories', () => {
    const reordered = [
      { id: 'ict', label: 'ICT' },
      { id: 'opiskelu', label: 'Opiskelu' },
      { id: 'smaprat', label: 'Rupattelu' },
    ]
    const result = categoriesForPart(items, 1, reordered)
    expect(result.map((c) => c.id)).toEqual(['opiskelu', 'smaprat'])
  })
})

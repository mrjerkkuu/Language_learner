import { describe, it, expect } from 'vitest'
import { getContent } from './contentService'
import { LANGUAGES } from './languages'
import { distractorsFrom } from '../lib/quizLogic'
import { categoriesForPart } from '../lib/categoryFilter'

describe('contentService', () => {
  it('falls back to the default language for an unknown id', () => {
    expect(getContent('xx')).toBe(getContent('sv'))
  })
})

// Concrete regression check for the FilterBar/PhraseBank category-chip
// narrowing: a category that only occurs under one part must not show up
// under another (this is what feeds the "available categories" chip list).
describe('categoriesForPart (sv content)', () => {
  const c = getContent('sv')
  const allItems = [...c.vocabulary, ...c.phrases, ...c.writingTasks, ...c.fillBlanks, ...c.wordForms]

  it('excludes ICT from part 1 (ICT items only exist under part 3)', () => {
    const visible = categoriesForPart(allItems, 1, c.CATEGORIES)
    expect(visible.find((cat) => cat.id === 'ict')).toBeUndefined()
  })

  it('includes ICT under part 3, where it actually occurs', () => {
    const visible = categoriesForPart(allItems, 3, c.CATEGORIES)
    expect(visible.find((cat) => cat.id === 'ict')).toBeDefined()
  })

  it('returns every category unfiltered when part is "all"', () => {
    expect(categoriesForPart(allItems, 'all', c.CATEGORIES)).toEqual(c.CATEGORIES)
  })
})

// Data-integrity tests run for every configured language.
for (const { id } of LANGUAGES) {
  describe(`content data: ${id}`, () => {
    const c = getContent(id)

    it('exposes all collections', () => {
      for (const key of ['vocabulary', 'phrases', 'writingTasks', 'fillBlanks', 'wordForms', 'PARTS', 'CATEGORIES']) {
        expect(Array.isArray(c[key]), `${key} should be an array`).toBe(true)
      }
      expect(c.vocabulary.length).toBeGreaterThanOrEqual(4)
    })

    it('vocabulary items are well-formed with unique ids', () => {
      const ids = c.vocabulary.map((v) => v.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const v of c.vocabulary) {
        expect(typeof v.term).toBe('string')
        expect(v.term.length).toBeGreaterThan(0)
        expect(typeof v.fi).toBe('string')
        expect(typeof v.part).toBe('number')
        expect(typeof v.category).toBe('string')
      }
    })

    it('every vocabulary item can yield 3 distinct quiz distractors', () => {
      for (const v of c.vocabulary) {
        const d = distractorsFrom(c.vocabulary, v, (x) => x.term, 4)
        expect(d, `distractors for ${v.id}`).toHaveLength(3)
        expect(new Set(d).size).toBe(3)
        expect(d).not.toContain(v.term)
      }
    })

    it('fillBlanks have a blank and a non-empty answer', () => {
      for (const f of c.fillBlanks) {
        expect(f.template).toContain('___')
        expect(typeof f.answer).toBe('string')
        expect(f.answer.length).toBeGreaterThan(0)
      }
    })

    it('wordForms options always include the correct answer', () => {
      for (const w of c.wordForms) {
        expect(Array.isArray(w.options)).toBe(true)
        expect(w.options.length).toBeGreaterThanOrEqual(2)
        expect(w.options).toContain(w.answer)
      }
    })

    it('writingTasks have task + finnish translation + model answer', () => {
      for (const t of c.writingTasks) {
        expect(typeof t.task).toBe('string')
        expect(typeof t.task_fi).toBe('string')
        expect(typeof t.model_answer).toBe('string')
      }
    })
  })
}

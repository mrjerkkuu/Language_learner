import { describe, it, expect } from 'vitest'
import { searchPhrases } from './phraseSearch'

const phrases = [
  { id: 'p1', term: 'Hur mår du?', fi: 'Mitä kuuluu?' },
  { id: 'p2', term: 'Vad heter du?', fi: 'Mikä sinun nimesi on?' },
  { id: 'p3', term: 'Tack så mycket', fi: 'Kiitos paljon' },
]

describe('searchPhrases', () => {
  it('returns everything for an empty query', () => {
    expect(searchPhrases(phrases, '')).toEqual(phrases)
  })

  it('treats a whitespace-only query as empty', () => {
    expect(searchPhrases(phrases, '   ')).toEqual(phrases)
  })

  it('matches against term', () => {
    expect(searchPhrases(phrases, 'heter')).toEqual([phrases[1]])
  })

  it('matches against fi', () => {
    expect(searchPhrases(phrases, 'kiitos')).toEqual([phrases[2]])
  })

  it('is case-insensitive', () => {
    expect(searchPhrases(phrases, 'HUR MÅR')).toEqual([phrases[0]])
  })

  it('returns an empty array when nothing matches', () => {
    expect(searchPhrases(phrases, 'xyz')).toEqual([])
  })
})

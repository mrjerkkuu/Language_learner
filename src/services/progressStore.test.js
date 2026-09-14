// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { progressStore } from './progressStore'
import { srsDataKey, STORAGE_KEYS } from '../lib/storageKeys'

// Locks the storage seam that Vaihe 3 will replace with a server implementation:
// round-trips, isolation per language, and the exact key format the app relies on.
describe('progressStore', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips spaced-repetition data per language', () => {
    expect(progressStore.loadSpacedRepetition('sv')).toEqual({}) // default
    progressStore.saveSpacedRepetition('sv', { v001: { weight: 1.5 } })
    expect(progressStore.loadSpacedRepetition('sv')).toEqual({ v001: { weight: 1.5 } })
    // A different language is a separate bucket.
    expect(progressStore.loadSpacedRepetition('en')).toEqual({})
  })

  it('writes SR under the exact key the app/tests expect', () => {
    progressStore.saveSpacedRepetition('sv', { x: 1 })
    expect(srsDataKey('sv')).toBe('srs-data-v1:sv')
    expect(JSON.parse(localStorage.getItem('srs-data-v1:sv'))).toEqual({ x: 1 })
  })

  it('round-trips the activity log with a sensible default', () => {
    expect(progressStore.loadActivity()).toEqual({ sessions: [] })
    progressStore.saveActivity({ sessions: [{ date: '2026-09-14', count: 3 }] })
    expect(progressStore.loadActivity()).toEqual({ sessions: [{ date: '2026-09-14', count: 3 }] })
    expect(localStorage.getItem(STORAGE_KEYS.activityLog)).toBeTruthy()
  })
})

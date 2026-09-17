// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { progressStore } from './progressStore'
import { apiClient } from './apiClient'
import { srsDataKey, STORAGE_KEYS } from '../lib/storageKeys'
import { todayKey } from '../lib/activityLogic'

vi.mock('./apiClient')

// Locks the storage seam that Vaihe 3 replaced with a dual (server/local)
// implementation: round-trips, isolation per language, and the exact key
// format the app relies on for the anon/local path, plus the new
// authed/server path (mocked apiClient) and its local fallback on failure.
describe('progressStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    progressStore.setAuthState({ status: 'anon', userId: null })
  })

  describe('anon (localStorage) path', () => {
    it('round-trips spaced-repetition data per language', async () => {
      expect(await progressStore.loadSpacedRepetition('sv')).toEqual({}) // default
      await progressStore.saveSpacedRepetition('sv', { v001: { weight: 1.5 } })
      expect(await progressStore.loadSpacedRepetition('sv')).toEqual({ v001: { weight: 1.5 } })
      // A different language is a separate bucket.
      expect(await progressStore.loadSpacedRepetition('en')).toEqual({})
    })

    it('writes SR under the exact key the app/tests expect', async () => {
      await progressStore.saveSpacedRepetition('sv', { x: 1 })
      expect(srsDataKey('sv')).toBe('srs-data-v1:sv')
      expect(JSON.parse(localStorage.getItem('srs-data-v1:sv'))).toEqual({ x: 1 })
    })

    it('loads the activity log as a computed summary, even with a sensible default', async () => {
      expect(await progressStore.loadActivity()).toEqual({
        today: 0,
        weekCount: 0,
        activeDaysThisWeek: 0,
        currentStreak: 0,
        bestStreak: 0,
      })
      // saveActivity still stores the raw log; loadActivity summarizes it (via
      // activityLogic.summarize) before returning, same as the server path.
      await progressStore.saveActivity({ sessions: [{ date: todayKey(), count: 3 }] })
      expect(localStorage.getItem(STORAGE_KEYS.activityLog)).toBeTruthy()
      expect(await progressStore.loadActivity()).toEqual({
        today: 3,
        weekCount: 3,
        activeDaysThisWeek: 1,
        currentStreak: 1,
        bestStreak: 1,
      })
    })

    it('recordSpacedRepetition computes locally and merges into the existing map', async () => {
      await progressStore.saveSpacedRepetition('sv', { v001: { weight: 1 } })
      const updated = await progressStore.recordSpacedRepetition('sv', 'v002', true, undefined)
      expect(updated.weight).toBeCloseTo(1.5) // 2.5 * 0.6, same as srLogic.test.js
      const all = await progressStore.loadSpacedRepetition('sv')
      expect(Object.keys(all).sort()).toEqual(['v001', 'v002']) // didn't clobber v001
    })

    it('recordActivity adds to today\'s local log and returns the computed summary', async () => {
      const result = await progressStore.recordActivity(2)
      expect(result).toEqual({
        today: 2,
        weekCount: 2,
        activeDaysThisWeek: 1,
        currentStreak: 1,
        bestStreak: 1,
      })
    })

    it('never calls apiClient when anon', async () => {
      await progressStore.loadSpacedRepetition('sv')
      await progressStore.recordSpacedRepetition('sv', 'v001', true, undefined)
      await progressStore.loadActivity()
      await progressStore.recordActivity(1)
      expect(apiClient.get).not.toHaveBeenCalled()
      expect(apiClient.post).not.toHaveBeenCalled()
    })
  })

  describe('authed (server) path', () => {
    beforeEach(() => {
      progressStore.setAuthState({ status: 'authed', userId: 'u1' })
    })

    it('loadSpacedRepetition fetches from the server with the language querystring', async () => {
      apiClient.get.mockResolvedValue({ ok: true, data: { items: { v001: { weight: 1.5 } } }, status: 200 })
      const result = await progressStore.loadSpacedRepetition('sv')
      expect(apiClient.get).toHaveBeenCalledWith('/api/progress?language=sv')
      expect(result).toEqual({ v001: { weight: 1.5 } })
    })

    it('loadSpacedRepetition falls back to localStorage if the server call fails', async () => {
      localStorage.setItem(srsDataKey('sv'), JSON.stringify({ v001: { weight: 3 } }))
      apiClient.get.mockResolvedValue({ ok: false, code: 'network', status: 0 })
      const result = await progressStore.loadSpacedRepetition('sv')
      expect(result).toEqual({ v001: { weight: 3 } })
    })

    it('recordSpacedRepetition posts to the server and returns its item as-is', async () => {
      apiClient.post.mockResolvedValue({
        ok: true,
        data: { item: { weight: 1.5, lastSeen: 1000, timesWrong: 0, timesCorrect: 1, learned: false } },
        status: 200,
      })
      const result = await progressStore.recordSpacedRepetition('sv', 'v001', true, undefined)
      expect(apiClient.post).toHaveBeenCalledWith('/api/progress/record', {
        language: 'sv',
        itemId: 'v001',
        correct: true,
      })
      expect(result).toEqual({ weight: 1.5, lastSeen: 1000, timesWrong: 0, timesCorrect: 1, learned: false })
    })

    it('recordSpacedRepetition falls back to local computation if the server call fails', async () => {
      apiClient.post.mockResolvedValue({ ok: false, code: 'network', status: 0 })
      const result = await progressStore.recordSpacedRepetition('sv', 'v001', true, undefined)
      expect(result.weight).toBeCloseTo(1.5) // computed locally via the shared srLogic engine
      // The fallback also persisted locally, so a follow-up local load sees it.
      progressStore.setAuthState({ status: 'anon', userId: null })
      expect(await progressStore.loadSpacedRepetition('sv')).toEqual({ v001: result })
    })

    it('loadActivity returns the server\'s pre-computed summary shape', async () => {
      const summary = { today: 3, weekCount: 5, activeDaysThisWeek: 2, currentStreak: 1, bestStreak: 4 }
      apiClient.get.mockResolvedValue({ ok: true, data: summary, status: 200 })
      expect(await progressStore.loadActivity()).toEqual(summary)
    })

    it('recordActivity posts to the server and returns its summary', async () => {
      const summary = { today: 1, weekCount: 1, activeDaysThisWeek: 1, currentStreak: 1, bestStreak: 1 }
      apiClient.post.mockResolvedValue({ ok: true, data: summary, status: 200 })
      const result = await progressStore.recordActivity(1)
      expect(apiClient.post).toHaveBeenCalledWith('/api/activity/record', { amount: 1 })
      expect(result).toEqual(summary)
    })

    it('recordActivity falls back to a locally-computed summary if the server call fails', async () => {
      apiClient.post.mockResolvedValue({ ok: false, code: 'network', status: 0 })
      const result = await progressStore.recordActivity(2)
      expect(result).toEqual({
        today: 2,
        weekCount: 2,
        activeDaysThisWeek: 1,
        currentStreak: 1,
        bestStreak: 1,
      })
    })
  })
})

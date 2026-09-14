import { useCallback, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useLanguage } from '../context/LanguageContext'

// -----------------------------------------------------------------------------
// useSpacedRepetition
// -----------------------------------------------------------------------------
// A lightweight, weighted spaced-repetition engine (NOT full SM-2). Each item
// gets a "weight" (review priority): higher weight = shown more often.
//
// Rating is simply CORRECT / WRONG (used by both Flashcards and Quiz):
//   - correct → weight ×0.6 (down, min 1) → appears less often
//   - wrong   → weight ×2.0 (up,  max 10) → appears more often
// "Easy vs hard" is therefore DERIVED, not chosen: a new word answered right
// straight away drops toward "easy/learned"; a wrong answer pushes it to "hard".
//
// Progress is stored per language (key includes the language id), so each
// language keeps its own progress.
//
// Per-item data (localStorage): { weight, lastSeen, timesWrong, timesCorrect, learned }
// -----------------------------------------------------------------------------

const STORAGE_PREFIX = 'srs-data-v1'

const DEFAULT_WEIGHT = 2.5
const MIN_WEIGHT = 1
const MAX_WEIGHT = 10
const RECENT_MS = 2 * 60 * 1000 // don't repeat an item seen < 2 minutes ago
const LEARNED_MIN_CORRECT = 3
const LEARNED_MAX_WEIGHT = 1.5
const DIFFICULT_WEIGHT = 2
const LEARNED_SHOW_EVERY = 10

const CORRECT_MULTIPLIER = 0.6
const WRONG_MULTIPLIER = 2.0

function defaultCardState() {
  return { weight: DEFAULT_WEIGHT, lastSeen: 0, timesWrong: 0, timesCorrect: 0, learned: false }
}

const clampWeight = (w) => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w))
const computeLearned = (card) =>
  card.timesCorrect >= LEARNED_MIN_CORRECT && card.weight <= LEARNED_MAX_WEIGHT

export function useSpacedRepetition() {
  // Per-language storage key.
  const { lang } = useLanguage()
  const [data, setData] = useLocalStorage(`${STORAGE_PREFIX}:${lang}`, {})

  const pickCounter = useRef(0)

  const getState = useCallback((id) => data[id] ?? defaultCardState(), [data])

  const getStatus = useCallback(
    (id) => {
      const card = data[id]
      if (!card || card.lastSeen === 0) return 'new'
      if (card.learned) return 'learned'
      return 'inProgress'
    },
    [data],
  )

  // Record a correct/wrong result and update the weight + counters.
  const recordResult = useCallback(
    (id, correct) => {
      setData((prev) => {
        const card = prev[id] ?? defaultCardState()
        const weight = clampWeight(card.weight * (correct ? CORRECT_MULTIPLIER : WRONG_MULTIPLIER))
        const updated = {
          ...card,
          weight,
          lastSeen: Date.now(),
          timesCorrect: card.timesCorrect + (correct ? 1 : 0),
          timesWrong: card.timesWrong + (correct ? 0 : 1),
        }
        // "learned" is recomputed each time, which gives regression for free:
        // a wrong answer raises the weight and can drop a word back out of learned.
        updated.learned = computeLearned(updated)
        return { ...prev, [id]: updated }
      })
    },
    [setData],
  )

  // Quiz uses the same correct/wrong mechanism (kept as a named alias).
  const recordQuiz = recordResult

  // Choose the next item from `items`:
  //   1. skip items seen < 2 minutes ago
  //   2. if all were seen recently, show the least-recently-seen
  //   3. otherwise weighted-random draw (higher weight = likelier)
  // `excludeId` avoids immediately repeating the current item.
  const pickNext = useCallback(
    (items, excludeId = null) => {
      if (!items || items.length === 0) return null
      const now = Date.now()
      pickCounter.current += 1
      const includeLearned = pickCounter.current % LEARNED_SHOW_EVERY === 0

      let candidates = items.filter((item) => {
        if (item.id === excludeId) return false
        const learned = (data[item.id] ?? defaultCardState()).learned
        return includeLearned ? true : !learned
      })
      if (candidates.length === 0) candidates = items.filter((item) => item.id !== excludeId)
      if (candidates.length === 0) candidates = items

      const notRecent = candidates.filter((item) => {
        const { lastSeen } = data[item.id] ?? defaultCardState()
        return now - lastSeen >= RECENT_MS
      })
      if (notRecent.length === 0) {
        return candidates.reduce((oldest, item) => {
          const a = (data[item.id] ?? defaultCardState()).lastSeen
          const b = (data[oldest.id] ?? defaultCardState()).lastSeen
          return a < b ? item : oldest
        })
      }

      const totalWeight = notRecent.reduce(
        (sum, item) => sum + (data[item.id] ?? defaultCardState()).weight,
        0,
      )
      let r = Math.random() * totalWeight
      for (const item of notRecent) {
        r -= (data[item.id] ?? defaultCardState()).weight
        if (r <= 0) return item
      }
      return notRecent[notRecent.length - 1]
    },
    [data],
  )

  // Filter-aware counters (pass the already-filtered items).
  const computeStats = useCallback(
    (items) => {
      let learned = 0
      let inProgress = 0
      let fresh = 0
      let difficult = 0
      for (const item of items) {
        const card = data[item.id]
        if (!card || card.lastSeen === 0) {
          fresh += 1
          continue
        }
        if (card.learned) learned += 1
        else inProgress += 1
        if (card.weight > DIFFICULT_WEIGHT) difficult += 1
      }
      return { total: items.length, learned, inProgress, new: fresh, difficult }
    },
    [data],
  )

  const resetProgress = useCallback(() => setData({}), [setData])

  return { getState, getStatus, recordResult, recordQuiz, pickNext, computeStats, resetProgress }
}

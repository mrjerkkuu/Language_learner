import { useCallback, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'

// -----------------------------------------------------------------------------
// useSpacedRepetition
// -----------------------------------------------------------------------------
// A lightweight, Duolingo-style spaced-repetition engine (NOT a full SM-2).
// Each card/word gets a "weight" (review priority): the higher the weight, the
// more often it should come up. Self-assessment and quiz results adjust it.
//
// Per-card data stored in localStorage under a single object keyed by card id:
//   {
//     "v001": { weight, lastSeen, timesWrong, timesCorrect, learned },
//     ...
//   }
//
// `learned` is derived from timesCorrect + weight, but also stored directly so
// counters can be read quickly without recomputing.
// -----------------------------------------------------------------------------

// --- Tunable constants (all in one place so they are easy to adjust) ---
const STORAGE_KEY = 'srs-data-v1'

const DEFAULT_WEIGHT = 2.5 // a brand-new, never-seen card starts here
const MIN_WEIGHT = 1 // easy answers can never push below this
const MAX_WEIGHT = 10 // cap so repeated wrong answers can't run away

const RECENT_MS = 2 * 60 * 1000 // don't repeat a card seen < 2 minutes ago

const LEARNED_MIN_CORRECT = 3 // needs at least this many correct answers ...
const LEARNED_MAX_WEIGHT = 1.5 // ... and a low weight to count as "learned"

const DIFFICULT_WEIGHT = 2 // "difficult words" = seen cards with weight above this
const LEARNED_SHOW_EVERY = 10 // re-surface a learned card roughly every 10th pick

// Weight multipliers for the 3-level self-assessment (Flashcards).
const MULTIPLIER = {
  easy: 0.5, // knew it well  -> show much less often
  medium: 1.2, // so-so         -> show a bit more often
  hard: 2.5, // struggled     -> show much more often
  quizCorrect: 0.6, // right answer in quiz -> lower priority
  quizWrong: 2.0, // wrong answer in quiz -> raise priority
}

// The default state for a card we have never recorded anything about.
function defaultCardState() {
  return { weight: DEFAULT_WEIGHT, lastSeen: 0, timesWrong: 0, timesCorrect: 0, learned: false }
}

// Clamp a weight into the allowed range.
const clampWeight = (w) => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w))

// Recompute the derived "learned" flag from a card's counters/weight.
const computeLearned = (card) =>
  card.timesCorrect >= LEARNED_MIN_CORRECT && card.weight <= LEARNED_MAX_WEIGHT

export function useSpacedRepetition() {
  // The whole progress map lives in one localStorage entry.
  const [data, setData] = useLocalStorage(STORAGE_KEY, {})

  // A simple counter (kept in a ref, not state, so it doesn't trigger renders)
  // used to decide when to re-surface an already-learned card.
  const pickCounter = useRef(0)

  // Read a card's state, falling back to the default for unseen cards.
  const getState = useCallback((id) => data[id] ?? defaultCardState(), [data])

  // Derive the 3-state status shown in the UI.
  // 'new'        = never seen
  // 'learned'    = meets the learned condition
  // 'inProgress' = seen but not yet learned
  const getStatus = useCallback(
    (id) => {
      const card = data[id]
      if (!card || card.lastSeen === 0) return 'new'
      if (card.learned) return 'learned'
      return 'inProgress'
    },
    [data],
  )

  // Apply a weight multiplier to a card and persist the updated counters.
  // `outcome` describes what happened; it decides which counter increments.
  const applyResult = useCallback(
    (id, multiplier, outcome) => {
      setData((prev) => {
        const card = prev[id] ?? defaultCardState()
        const nextWeight = clampWeight(card.weight * multiplier)

        const updated = {
          ...card,
          weight: nextWeight,
          lastSeen: Date.now(),
          timesCorrect: card.timesCorrect + (outcome === 'correct' ? 1 : 0),
          timesWrong: card.timesWrong + (outcome === 'wrong' ? 1 : 0),
        }
        // Recompute learned AFTER updating counters/weight. This also gives us
        // regression for free: a wrong answer raises the weight, so a card can
        // drop back out of "learned" on its own.
        updated.learned = computeLearned(updated)

        return { ...prev, [id]: updated }
      })
    },
    [setData],
  )

  // --- Public actions -------------------------------------------------------

  // Flashcard self-assessment: 'easy' | 'medium' | 'hard'.
  // easy/medium count as "correct" for the learned condition; hard counts as
  // "wrong" so struggling with a card can pull it back from learned.
  const recordAssessment = useCallback(
    (id, level) => {
      const outcome = level === 'hard' ? 'wrong' : 'correct'
      applyResult(id, MULTIPLIER[level], outcome)
    },
    [applyResult],
  )

  // Quiz result: a boolean correct/incorrect.
  const recordQuiz = useCallback(
    (id, correct) => {
      applyResult(id, correct ? MULTIPLIER.quizCorrect : MULTIPLIER.quizWrong, correct ? 'correct' : 'wrong')
    },
    [applyResult],
  )

  // --- Next-card selection --------------------------------------------------
  // Chooses the next card from `items` using the rules from the plan:
  //   1. Skip cards seen < 2 minutes ago.
  //   2. If everything was seen recently, fall back to the least-recently-seen.
  //   3. Otherwise pick with a weighted random draw (higher weight = likelier).
  // `excludeId` lets the caller avoid immediately repeating the current card.
  const pickNext = useCallback(
    (items, excludeId = null) => {
      if (!items || items.length === 0) return null

      const now = Date.now()
      pickCounter.current += 1

      // Roughly every 10th pick we allow a learned card back in for reinforcement.
      const includeLearned = pickCounter.current % LEARNED_SHOW_EVERY === 0

      // Candidate set: drop the current card and (usually) already-learned ones.
      let candidates = items.filter((item) => {
        if (item.id === excludeId) return false
        const learned = (data[item.id] ?? defaultCardState()).learned
        return includeLearned ? true : !learned
      })

      // If filtering left nothing (e.g. everything is learned), fall back to the
      // full set minus the current card so the session never dead-ends.
      if (candidates.length === 0) {
        candidates = items.filter((item) => item.id !== excludeId)
      }
      if (candidates.length === 0) candidates = items // last resort: allow repeat

      // Rule 1: prefer cards not seen in the last 2 minutes.
      const notRecent = candidates.filter((item) => {
        const { lastSeen } = data[item.id] ?? defaultCardState()
        return now - lastSeen >= RECENT_MS
      })

      // Rule 2: if all candidates were seen recently, show the least-recent one.
      if (notRecent.length === 0) {
        return candidates.reduce((oldest, item) => {
          const a = (data[item.id] ?? defaultCardState()).lastSeen
          const b = (data[oldest.id] ?? defaultCardState()).lastSeen
          return a < b ? item : oldest
        })
      }

      // Rule 3: weighted random draw among the eligible cards.
      const totalWeight = notRecent.reduce(
        (sum, item) => sum + (data[item.id] ?? defaultCardState()).weight,
        0,
      )
      let r = Math.random() * totalWeight
      for (const item of notRecent) {
        r -= (data[item.id] ?? defaultCardState()).weight
        if (r <= 0) return item
      }
      // Floating-point safety net: return the last candidate.
      return notRecent[notRecent.length - 1]
    },
    [data],
  )

  // --- Counters for the UI (respect whatever item subset is passed in) ------
  // Pass the already-filtered items so the counts match the active filter.
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
        // "Difficult" = a card we have actually seen and whose weight is high.
        if (card.weight > DIFFICULT_WEIGHT) difficult += 1
      }

      return { total: items.length, learned, inProgress, new: fresh, difficult }
    },
    [data],
  )

  // Wipe all progress (used by a "reset" action, if the UI offers one).
  const resetProgress = useCallback(() => setData({}), [setData])

  return {
    getState,
    getStatus,
    recordAssessment,
    recordQuiz,
    pickNext,
    computeStats,
    resetProgress,
  }
}

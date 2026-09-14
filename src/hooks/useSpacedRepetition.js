import { useCallback, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useLanguage } from '../context/LanguageContext'
import {
  defaultCardState,
  applyResult,
  deriveStatus,
  computeStats as computeStatsPure,
  pickNext as pickNextPure,
} from '../lib/srLogic'

// -----------------------------------------------------------------------------
// useSpacedRepetition
// -----------------------------------------------------------------------------
// React wrapper around the pure engine in ../lib/srLogic. This hook owns the
// per-language storage, the "show a learned card every 10th pick" counter, and
// supplies real time/randomness; all the actual logic (and its tests) live in
// srLogic. Rating is CORRECT / WRONG; "easy vs hard" is derived from the weight.
// -----------------------------------------------------------------------------

const STORAGE_PREFIX = 'srs-data-v1'
const LEARNED_SHOW_EVERY = 10

export function useSpacedRepetition() {
  const { lang } = useLanguage()
  const [data, setData] = useLocalStorage(`${STORAGE_PREFIX}:${lang}`, {})
  const pickCounter = useRef(0)

  const getState = useCallback((id) => data[id] ?? defaultCardState(), [data])

  const getStatus = useCallback((id) => deriveStatus(data[id]), [data])

  const recordResult = useCallback(
    (id, correct) => {
      setData((prev) => ({ ...prev, [id]: applyResult(prev[id], correct) }))
    },
    [setData],
  )

  // Quiz uses the same correct/wrong mechanism (kept as a named alias).
  const recordQuiz = recordResult

  const pickNext = useCallback(
    (items, excludeId = null) => {
      pickCounter.current += 1
      const includeLearned = pickCounter.current % LEARNED_SHOW_EVERY === 0
      return pickNextPure(data, items, { excludeId, includeLearned })
    },
    [data],
  )

  const computeStats = useCallback((items) => computeStatsPure(data, items), [data])

  const resetProgress = useCallback(() => setData({}), [setData])

  return { getState, getStatus, recordResult, recordQuiz, pickNext, computeStats, resetProgress }
}

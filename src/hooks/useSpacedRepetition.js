import { useCallback, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { progressStore } from '../services/progressStore'
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
// "show a learned card every 10th pick" counter and supplies real
// time/randomness; all the actual logic (and its tests) live in srLogic.
// Persistence goes through progressStore (localStorage today, server in Vaihe 3)
// so this hook won't change when the backend lands. Rating is CORRECT / WRONG;
// "easy vs hard" is derived from the weight.
//
// Note: the app remounts the routed subtree on language change (key={lang}), so
// this hook re-initialises from the new language's stored data on remount.
// -----------------------------------------------------------------------------

const LEARNED_SHOW_EVERY = 10

export function useSpacedRepetition() {
  const { lang } = useLanguage()
  const [data, setDataState] = useState(() => progressStore.loadSpacedRepetition(lang))
  const pickCounter = useRef(0)

  // Update in-memory state AND persist through the store. Accepts a value or a
  // functional updater, mirroring setState.
  const setData = useCallback(
    (value) => {
      setDataState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value
        progressStore.saveSpacedRepetition(lang, next)
        return next
      })
    },
    [lang],
  )

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

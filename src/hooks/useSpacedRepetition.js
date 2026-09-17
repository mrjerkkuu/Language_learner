import { useProgress } from '../context/ProgressContext'

// -----------------------------------------------------------------------------
// useSpacedRepetition
// -----------------------------------------------------------------------------
// Thin wrapper around ProgressContext, kept so every existing call site
// (Flashcard, Quiz, WordForms, MotivationBar, StreakSheet) can keep calling
// useSpacedRepetition() unchanged. The actual state — load, ready flag,
// recordResult, etc. — now lives once in <ProgressProvider>, not per caller;
// see context/ProgressContext.jsx for why.
// -----------------------------------------------------------------------------

export function useSpacedRepetition() {
  return useProgress()
}

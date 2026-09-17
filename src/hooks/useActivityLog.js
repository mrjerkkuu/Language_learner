import { useActivity } from '../context/ActivityContext'

// -----------------------------------------------------------------------------
// useActivityLog
// -----------------------------------------------------------------------------
// Thin wrapper around ActivityContext, kept so every existing call site
// (Home, Flashcard, PhraseBank, WordForms, WritingPractice, MotivationBar,
// Quiz, StreakSheet) can keep calling useActivityLog() unchanged. The actual
// state — load, ready flag, logActivity — now lives once in
// <ActivityProvider>, not per caller; see context/ActivityContext.jsx for why.
// -----------------------------------------------------------------------------

export function useActivityLog() {
  return useActivity()
}

// -----------------------------------------------------------------------------
// srLogic — pure spaced-repetition logic (no React, no storage).
// -----------------------------------------------------------------------------
// Extracted from useSpacedRepetition so it can be unit-tested directly. The hook
// owns state/storage and time/randomness; these functions are pure given their
// inputs (time and randomness are injected so tests are deterministic).
// -----------------------------------------------------------------------------

export const SR = {
  DEFAULT_WEIGHT: 2.5,
  MIN_WEIGHT: 1,
  MAX_WEIGHT: 10,
  RECENT_MS: 2 * 60 * 1000, // don't repeat an item seen < 2 minutes ago
  LEARNED_MIN_CORRECT: 3,
  LEARNED_MAX_WEIGHT: 1.5,
  DIFFICULT_WEIGHT: 2,
  CORRECT_MULTIPLIER: 0.6, // correct -> weight down (seen less)
  WRONG_MULTIPLIER: 2.0, // wrong   -> weight up   (seen more)
}

export function defaultCardState() {
  return { weight: SR.DEFAULT_WEIGHT, lastSeen: 0, timesWrong: 0, timesCorrect: 0, learned: false }
}

export const clampWeight = (w) => Math.min(SR.MAX_WEIGHT, Math.max(SR.MIN_WEIGHT, w))

export const computeLearned = (card) =>
  card.timesCorrect >= SR.LEARNED_MIN_CORRECT && card.weight <= SR.LEARNED_MAX_WEIGHT

// Apply a correct/wrong result to a card, returning the NEW card state.
export function applyResult(card, correct, now = Date.now()) {
  const base = card ?? defaultCardState()
  const weight = clampWeight(base.weight * (correct ? SR.CORRECT_MULTIPLIER : SR.WRONG_MULTIPLIER))
  const updated = {
    ...base,
    weight,
    lastSeen: now,
    timesCorrect: base.timesCorrect + (correct ? 1 : 0),
    timesWrong: base.timesWrong + (correct ? 0 : 1),
  }
  updated.learned = computeLearned(updated)
  return updated
}

// Derive the UI status of a card: 'new' | 'inProgress' | 'learned'.
export function deriveStatus(card) {
  if (!card || card.lastSeen === 0) return 'new'
  if (card.learned) return 'learned'
  return 'inProgress'
}

// Count learned / inProgress / new / difficult over a set of items.
export function computeStats(dataMap, items) {
  let learned = 0
  let inProgress = 0
  let fresh = 0
  let difficult = 0
  for (const item of items) {
    const card = dataMap[item.id]
    if (!card || card.lastSeen === 0) {
      fresh += 1
      continue
    }
    if (card.learned) learned += 1
    else inProgress += 1
    if (card.weight > SR.DIFFICULT_WEIGHT) difficult += 1
  }
  return { total: items.length, learned, inProgress, new: fresh, difficult }
}

// Choose the next item to show. Rules:
//   1. skip items seen < RECENT_MS ago
//   2. if all were seen recently, return the least-recently-seen
//   3. otherwise weighted-random draw (higher weight = likelier)
// `now` and `random` are injected for deterministic tests.
export function pickNext(
  dataMap,
  items,
  { excludeId = null, includeLearned = false, now = Date.now(), random = Math.random } = {},
) {
  if (!items || items.length === 0) return null
  const state = (id) => dataMap[id] ?? defaultCardState()

  let candidates = items.filter((item) => {
    if (item.id === excludeId) return false
    return includeLearned ? true : !state(item.id).learned
  })
  if (candidates.length === 0) candidates = items.filter((item) => item.id !== excludeId)
  if (candidates.length === 0) candidates = items

  const notRecent = candidates.filter((item) => now - state(item.id).lastSeen >= SR.RECENT_MS)

  if (notRecent.length === 0) {
    // Rule 2: least-recently-seen among candidates.
    return candidates.reduce((oldest, item) =>
      state(item.id).lastSeen < state(oldest.id).lastSeen ? item : oldest,
    )
  }

  // Rule 3: weighted random draw.
  const totalWeight = notRecent.reduce((sum, item) => sum + state(item.id).weight, 0)
  let r = random() * totalWeight
  for (const item of notRecent) {
    r -= state(item.id).weight
    if (r <= 0) return item
  }
  return notRecent[notRecent.length - 1]
}

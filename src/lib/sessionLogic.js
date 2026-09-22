import { SR, defaultCardState } from './srLogic'
import { weightedSample } from './quizLogic'
import { shuffle } from '../utils/shuffle'

// -----------------------------------------------------------------------------
// sessionLogic — pure logic for building a limited, weighted Flashcards
// session (no React, no storage). Reuses srLogic's card-state shape and
// quizLogic's weightedSample (the existing "pick N weighted, no repeats"
// primitive) instead of duplicating any weighting math.
// -----------------------------------------------------------------------------

export const SESSION = {
  SIZE: 20,
  NEW_TARGET: 2,
  EASY_TARGET: 2,
  MAIN_TARGET: 16, // SIZE - NEW_TARGET - EASY_TARGET
}

// Build a bounded, weighted practice session from `items` (already
// filter-scoped by the caller, e.g. FilterContext.filterItems).
//
// Composition:
//   - mainBucket (practiced, not learned): weighted by card.weight, so
//     harder/older cards are more likely — the SESSION_SIZE analogue of
//     pickNext's rule 3.
//   - easyBucket (learned): a small fixed quota so they keep cycling in
//     occasionally instead of disappearing once learned.
//   - newBucket (never practiced): a small typical quota that GROWS to
//     absorb any deficit main/easy couldn't fill, so the session still
//     reaches SESSION.SIZE whenever enough cards exist in total.
// If the total available pool is under SESSION.SIZE, the whole pool is
// returned — no padding, no repeats.
//
// Recency: mainBucket/easyBucket exclude cards seen within SR.RECENT_MS of
// `now` (same rule as pickNext's "don't repeat an item seen <2min ago"),
// falling back to the unfiltered bucket if that would empty it out.
//
// A card can only ever belong to one bucket, so uniqueness across the whole
// session is automatic — no separate "already picked" tracking is needed.
export function buildSession(dataMap, items, { now = Date.now(), random = Math.random } = {}) {
  const state = (id) => dataMap[id] ?? defaultCardState()
  const notRecent = (item) => now - state(item.id).lastSeen >= SR.RECENT_MS
  const withRecencyFallback = (bucket) => {
    const filtered = bucket.filter(notRecent)
    return filtered.length > 0 ? filtered : bucket
  }

  const isNew = (item) => state(item.id).lastSeen === 0
  const isEasy = (item) => !isNew(item) && state(item.id).learned

  const newBucket = items.filter(isNew)
  const easyBucket = withRecencyFallback(items.filter((item) => isEasy(item)))
  const mainBucket = withRecencyFallback(items.filter((item) => !isNew(item) && !isEasy(item)))

  const mainDeficit = Math.max(0, SESSION.MAIN_TARGET - mainBucket.length)
  const easyTake = Math.min(SESSION.EASY_TARGET, easyBucket.length)
  const easyDeficit = SESSION.EASY_TARGET - easyTake
  const newTarget = SESSION.NEW_TARGET + mainDeficit + easyDeficit
  const newTake = Math.min(newTarget, newBucket.length)
  const newDeficit = newTarget - newTake
  const mainTake = Math.min(SESSION.MAIN_TARGET + newDeficit, mainBucket.length)

  const picked = [
    ...weightedSample(mainBucket, mainTake, (item) => state(item.id).weight, random),
    ...weightedSample(easyBucket, easyTake, () => 1, random),
    ...weightedSample(newBucket, newTake, () => 1, random),
  ]

  return shuffle(picked)
}

import { SR, defaultCardState } from './srLogic'
import { weightedSample } from './quizLogic'
import { shuffle } from '../utils/shuffle'

// -----------------------------------------------------------------------------
// sessionLogic — pure logic for building a limited, weighted Flashcards
// session (no React, no storage). Reuses srLogic's card-state shape and
// quizLogic's weightedSample (the existing "pick N weighted, no repeats"
// primitive) instead of duplicating any weighting math.
// -----------------------------------------------------------------------------

// Session sizes the user can pick before a session (Sanakortit, Muodot).
export const SESSION_SIZES = [5, 10, 15, 20]
export const DEFAULT_SESSION_SIZE = 20

// Per-bucket targets for a session of `size`: ~10 % learned ("easy") and ~10 %
// never-seen ("new") cards, at least one of each, the rest practised ("main").
//   5 -> 3+1+1 · 10 -> 8+1+1 · 15 -> 13+1+1 · 20 -> 16+2+2
export function sessionQuotas(size) {
  const side = Math.max(1, Math.floor(size / 10))
  return { main: Math.max(0, size - 2 * side), easy: side, new: side }
}

// A stored/unknown value -> one of SESSION_SIZES, else `fallback`.
export function normalizeSessionSize(value, fallback = DEFAULT_SESSION_SIZE) {
  return SESSION_SIZES.includes(value) ? value : fallback
}

// Build a bounded, weighted practice session from `items` (already
// filter-scoped by the caller, e.g. FilterContext.filterItems).
//
// Composition:
//   - mainBucket (practiced, not learned): weighted by card.weight, so
//     harder/older cards are more likely — the session analogue of
//     pickNext's rule 3.
//   - easyBucket (learned): a small fixed quota so they keep cycling in
//     occasionally instead of disappearing once learned.
//   - newBucket (never practiced): a small typical quota that GROWS to
//     absorb any deficit main/easy couldn't fill, so the session still
//     reaches `size` whenever enough cards exist in total.
// If the total available pool is under `size`, the whole pool is returned —
// no padding, no repeats. Quotas scale with `size` (see sessionQuotas).
//
// Recency: mainBucket/easyBucket exclude cards seen within SR.RECENT_MS of
// `now` (same rule as pickNext's "don't repeat an item seen <2min ago"),
// falling back to the unfiltered bucket if that would empty it out.
//
// A card can only ever belong to one bucket, so uniqueness across the whole
// session is automatic — no separate "already picked" tracking is needed.
export function buildSession(
  dataMap,
  items,
  { now = Date.now(), random = Math.random, size = DEFAULT_SESSION_SIZE } = {},
) {
  const quota = sessionQuotas(size)
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

  const mainDeficit = Math.max(0, quota.main - mainBucket.length)
  const easyTake = Math.min(quota.easy, easyBucket.length)
  const easyDeficit = quota.easy - easyTake
  const newTarget = quota.new + mainDeficit + easyDeficit
  const newTake = Math.min(newTarget, newBucket.length)
  const newDeficit = newTarget - newTake
  const mainTake = Math.min(quota.main + newDeficit, mainBucket.length)

  const picked = [
    ...weightedSample(mainBucket, mainTake, (item) => state(item.id).weight, random),
    ...weightedSample(easyBucket, easyTake, () => 1, random),
    ...weightedSample(newBucket, newTake, () => 1, random),
  ]

  return shuffle(picked)
}

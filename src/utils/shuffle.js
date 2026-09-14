// Fisher-Yates shuffle: returns a NEW array with the elements randomly ordered.
// Used to randomize quiz option order every time (so the correct answer isn't
// always in the same position, and distractors don't repeat in a fixed order).
// This is unbiased, unlike the common `sort(() => Math.random() - 0.5)` trick.
export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

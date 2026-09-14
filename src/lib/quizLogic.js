import { shuffle } from '../utils/shuffle'

// -----------------------------------------------------------------------------
// quizLogic — pure helpers for building quiz questions (no React).
// -----------------------------------------------------------------------------

// Pick optionCount-1 distractor strings for `target`: prefer the same
// category+part, then the same category, then anything. `sourcePool` is the FULL
// data set so a narrow filter still yields enough options. `getText` maps an
// item to the string shown as an option.
export function distractorsFrom(sourcePool, target, getText, optionCount = 4) {
  const need = optionCount - 1
  const correctText = getText(target)

  const sameCatPart = sourcePool.filter(
    (x) => x.id !== target.id && x.category === target.category && x.part === target.part,
  )
  const sameCat = sourcePool.filter((x) => x.id !== target.id && x.category === target.category)
  const everything = sourcePool.filter((x) => x.id !== target.id)

  const ordered = [...shuffle(sameCatPart), ...shuffle(sameCat), ...shuffle(everything)]
  const seen = new Set()
  const out = []
  for (const x of ordered) {
    const text = getText(x)
    if (text === correctText || seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length === need) break
  }
  return out
}

// Weighted sampling WITHOUT replacement: pick up to n items, higher weight =
// likelier. `random` is injected for deterministic tests.
export function weightedSample(items, n, getWeight, random = Math.random) {
  const pool = [...items]
  const picked = []
  const count = Math.min(n, pool.length)
  for (let k = 0; k < count; k++) {
    const total = pool.reduce((s, it) => s + Math.max(0.001, getWeight(it)), 0)
    let r = random() * total
    let idx = 0
    for (let i = 0; i < pool.length; i++) {
      r -= Math.max(0.001, getWeight(pool[i]))
      if (r <= 0) {
        idx = i
        break
      }
    }
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked
}

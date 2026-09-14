// English content: topic areas (part) and finer topics (category).
// Same shape as the Swedish set.
//
// IMPORTANT: These `label`s are UI navigation text, and the app UI is in
// Finnish — so every label here is in Finnish, regardless of the target
// language. (The learning content itself — words, phrases, example
// sentences — stays in English; that lives in the en/*.json data files.)
// The `id`s are the stable keys referenced by the data, so never change them.
export const PARTS = [
  { id: 1, label: 'Arki ja tutustuminen' },
  { id: 2, label: 'Työelämä ja viestintä' },
  { id: 3, label: 'IT ja tekniikka' },
]

export const CATEGORIES = [
  { id: 'smalltalk', label: 'Rupattelu' },
  { id: 'everyday', label: 'Arki' },
  { id: 'work', label: 'Työelämä' },
  { id: 'communication', label: 'Viestintä' },
  { id: 'it', label: 'IT' },
]

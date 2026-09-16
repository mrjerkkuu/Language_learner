// Swedish content: topic areas (part) and finer topics (category).
// Two independent, cross-usable dimensions.
//
// IMPORTANT: These `label`s are UI navigation text, and the app UI is in
// Finnish — so every label here is in Finnish, regardless of the target
// language. (The learning content itself — words, phrases, example
// sentences — stays in Swedish; that lives in the sv/*.json data files.)
// The `id`s are the stable keys referenced by the data, so never change them.
export const PARTS = [
  { id: 1, label: 'Opiskelu ja tutustuminen' },
  { id: 2, label: 'Työelämä ja viestintä' },
  { id: 3, label: 'Oma ala' },
]

export const CATEGORIES = [
  { id: 'smaprat', label: 'Rupattelu' },
  { id: 'opiskelu', label: 'Opiskelu' },
  { id: 'tyoelama', label: 'Työelämä' },
  { id: 'viestinta', label: 'Viestintä' },
  { id: 'ict', label: 'ICT' },
  { id: 'perhe', label: 'Perhe' },
  { id: 'asuminen', label: 'Asuminen' },
  { id: 'kysymyssanat', label: 'Kysymyssanat' },
  { id: 'harrastukset', label: 'Harrastukset' },
  { id: 'esittaytyminen', label: 'Esittäytyminen' },
  { id: 'tervehdykset', label: 'Tervehdys ja hyvästely' },
  { id: 'kuulumiset', label: 'Kuulumiset' },
  { id: 'kiitokset', label: 'Kiitos ja anteeksi' },
  { id: 'kuuntelu', label: 'Aktiivinen kuuntelu' },
  { id: 'selvennys', label: 'Kun et ymmärrä' },
  { id: 'puheenvuoro', label: 'Puheenvuoro ja ehdotukset' },
]

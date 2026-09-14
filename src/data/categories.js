// Filtering metadata: the course PARTS (part) and TOPICS (category).
//
// These are two independent dimensions, used together (cross-filtering):
//   - part     = course part / temporal progress (Del 1 / 2 / 3)
//   - category = topic (enables reviewing across part boundaries)
//
// All data files (vocabulary/phrases/writingTasks/fillBlanks) use these same
// id values. When you add real course material, reuse these ids or add new
// rows here — the UI updates automatically. `label` is the Finnish display
// name shown in the UI.

export const PARTS = [
  { id: 1, label: 'Del 1', subtitle: 'Studier & småprat' },
  { id: 2, label: 'Del 2', subtitle: 'Arbetslivet & kommunikation' },
  { id: 3, label: 'Del 3', subtitle: 'Min bransch (ICT)' },
]

export const CATEGORIES = [
  { id: 'smaprat', label: 'Small talk' },
  { id: 'opiskelu', label: 'Opiskelu' },
  { id: 'tyoelama', label: 'Työelämä' },
  { id: 'viestinta', label: 'Viestintä' },
  { id: 'ict', label: 'ICT' },
]

// Helpers: id -> display name. Fall back to the id itself if no label is found,
// so a new (not-yet-named) category can't crash the UI.
export const categoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id

export const partLabel = (id) =>
  PARTS.find((p) => p.id === id)?.label ?? `Del ${id}`

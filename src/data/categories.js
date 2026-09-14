// Filtering metadata: the broad TOPIC AREAS (part) and finer TOPICS (category).
//
// Two independent dimensions, used together (cross-filtering):
//   - part     = broad topic area (a themed section of the material)
//   - category = finer topic (enables reviewing across area boundaries)
//
// NOTE: these labels are deliberately generic topic names (not "Del 1/2/3"),
// so the app works for anyone — not just this specific course. To adapt the app
// to different material, just rename these labels (and reuse the same ids in the
// data files) — no code changes needed. `label` is the display name in the UI.

export const PARTS = [
  { id: 1, label: 'Studier & småprat' },
  { id: 2, label: 'Arbetslivet & kommunikation' },
  { id: 3, label: 'Min bransch' },
]

export const CATEGORIES = [
  { id: 'smaprat', label: 'Small talk' },
  { id: 'opiskelu', label: 'Opiskelu' },
  { id: 'tyoelama', label: 'Työelämä' },
  { id: 'viestinta', label: 'Viestintä' },
  { id: 'ict', label: 'ICT' },
]

// Helpers: id -> display name. Fall back to the id itself if no label is found,
// so a new (not-yet-named) area/category can't crash the UI.
export const partLabel = (id) => PARTS.find((p) => p.id === id)?.label ?? `Osa ${id}`

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id

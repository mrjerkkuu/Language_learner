import { useMemo } from 'react'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { categoriesForPart } from '../lib/categoryFilter'

// -----------------------------------------------------------------------------
// FilterBar
// -----------------------------------------------------------------------------
// The global filter on the home page. Two dimensions:
//   - area  (single choice): "Kaikki" + one pill per topic area, in a
//            horizontally scrolling row (fits long titles on a phone).
//   - topic (multi-select): chips; empty selection means "all topics".
// Both read/write the shared FilterContext, so every module sees the selection.
//
// The topic chips shown are narrowed to whichever categories actually occur
// (in any content type) for the selected area — e.g. "ICT" doesn't show up
// under "Tutustuminen". This is computed from the data itself
// (see lib/categoryFilter) rather than a maintained area→topic table.
// -----------------------------------------------------------------------------

export default function FilterBar() {
  const { part, setPart, categories, toggleCategory } = useFilter()
  const { content, partLabel } = useLanguage()

  // Every content type carries part+category, so the union of all of them is
  // what "which topics exist under this area" must be checked against.
  const allItems = useMemo(
    () => [
      ...content.vocabulary,
      ...content.phrases,
      ...content.writingTasks,
      ...content.fillBlanks,
      ...content.wordForms,
    ],
    [content],
  )

  const visibleCategories = useMemo(
    () => categoriesForPart(allItems, part, content.CATEGORIES),
    [allItems, part, content.CATEGORIES],
  )

  return (
    <div className="space-y-3">
      {/* Area pills — horizontal, scrollable. The -mx-4/px-4 lets the row bleed
          to the screen edges; no-scrollbar hides the scrollbar but keeps scroll. */}
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 py-1.5">
        <div className="flex w-max gap-2">
          <Pill
            active={part === 'all'}
            onClick={() => {
              // The topic-chip row is hidden entirely when part is 'all' (see
              // below), so any selected topic would become invisible and
              // un-clearable — drop the selection along with the row.
              setPart('all', [])
            }}
          >
            Kaikki
          </Pill>
          {content.PARTS.map((p) => (
            <Pill
              key={p.id}
              active={part === p.id}
              onClick={() => {
                const validIds = categoriesForPart(allItems, p.id, content.CATEGORIES).map((c) => c.id)
                setPart(p.id, validIds)
              }}
            >
              {partLabel(p.id)}
            </Pill>
          ))}
        </div>
      </div>

      {/* Topic chips — multi-select, narrowed to the selected area. Hidden
          entirely until a specific area is chosen (there's nothing to
          narrow down to under "Kaikki", and no maintained topic list to
          show as a placeholder). */}
      {part !== 'all' && (
        <div className="flex flex-wrap gap-2">
          {visibleCategories.map((c) => {
            const selected = categories.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                aria-pressed={selected}
                className={
                  'touch-target rounded-full px-3 text-sm font-medium transition-colors ' +
                  (selected
                    ? 'bg-accent-soft text-accent ring-1 ring-accent/30'
                    : 'bg-card text-muted ring-1 ring-line active:bg-bg')
                }
              >
                {c.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// A single area pill (single-choice). Active = filled accent.
function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'touch-target whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ' +
        (active ? 'bg-accent text-white' : 'bg-card text-ink ring-1 ring-line active:bg-bg')
      }
    >
      {children}
    </button>
  )
}

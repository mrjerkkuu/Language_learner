import { useFilter } from '../context/FilterContext'
import { PARTS, CATEGORIES } from '../data/categories'

// -----------------------------------------------------------------------------
// FilterBar
// -----------------------------------------------------------------------------
// Reusable filter control used on the home page (and available to any module).
// It reads and writes the global FilterContext, so wherever it is rendered it
// controls the same shared filter.
//
// Layout is mobile-first: part options are a wrapping row of pill buttons and
// categories are toggle chips. Every interactive element is a real <button>
// with a min height of 44px (touch-target), and nothing relies on hover.
// -----------------------------------------------------------------------------

export default function FilterBar() {
  const { part, setPart, categories, toggleCategory, clearFilters, isFiltered } = useFilter()

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {/* --- Part selector (single choice) --- */}
      <div className="mb-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Osa
        </div>
        <div className="flex flex-wrap gap-2">
          {/* "Kaikki" (all) + one button per Del. The active option is filled teal. */}
          <PartButton active={part === 'all'} onClick={() => setPart('all')}>
            Kaikki
          </PartButton>
          {PARTS.map((p) => (
            <PartButton key={p.id} active={part === p.id} onClick={() => setPart(p.id)}>
              {p.label}
            </PartButton>
          ))}
        </div>
      </div>

      {/* --- Category selector (multi-select) --- */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Aihepiiri
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const selected = categories.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                aria-pressed={selected}
                className={
                  'touch-target rounded-full px-4 text-sm font-medium transition-colors ' +
                  (selected
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 active:bg-slate-200')
                }
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- Reset link: only shown when something is actually filtered --- */}
      {isFiltered && (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-3 text-sm font-medium text-brand-700 underline underline-offset-2"
        >
          Tyhjennä suodattimet
        </button>
      )}
    </div>
  )
}

// Small internal button for the part selector. Kept here (not exported) because
// it is only used by FilterBar.
function PartButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'touch-target rounded-full px-4 text-sm font-medium transition-colors ' +
        (active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 active:bg-slate-200')
      }
    >
      {children}
    </button>
  )
}

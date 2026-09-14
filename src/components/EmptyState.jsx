import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'

// -----------------------------------------------------------------------------
// EmptyState
// -----------------------------------------------------------------------------
// Shown when the active filter leaves a module with no content. Per the 2a
// design: a neutral striped placeholder box, a short message, an explanation of
// which filter is active, and a "Nollaa suodatin" (reset) button.
// -----------------------------------------------------------------------------

export default function EmptyState({ title = 'Ei sisältöä' }) {
  const { part, categories, clearFilters, isFiltered } = useFilter()
  const { partLabel, categoryLabel } = useLanguage()

  // Human-readable description of the active filter.
  const partText = part === 'all' ? 'Kaikki alueet' : partLabel(part)
  const categoryText =
    categories.length === 0 ? 'kaikki aihepiirit' : categories.map(categoryLabel).join(', ')

  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-card p-8 text-center">
      {/* Striped placeholder square. */}
      <div
        className="mb-4 h-16 w-16 rounded-2xl border border-line"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, oklch(0.91 0.006 260) 0 6px, transparent 6px 12px)',
        }}
        aria-hidden="true"
      />
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">
        Suodattimella <strong className="text-ink">{partText}</strong> · {categoryText} ei ole vielä
        sisältöä. Kokeile toista aluetta tai aihepiiriä.
      </p>

      {isFiltered && (
        <button
          type="button"
          onClick={clearFilters}
          className="touch-target mt-4 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white active:brightness-95"
        >
          Nollaa suodatin
        </button>
      )}
    </div>
  )
}

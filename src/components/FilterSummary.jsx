import { Link } from 'react-router-dom'
import { useFilter } from '../context/FilterContext'
import { partLabel, categoryLabel } from '../data/categories'

// -----------------------------------------------------------------------------
// FilterSummary
// -----------------------------------------------------------------------------
// A compact, read-only view of the active filter, shown at the top of each
// module page. The full FilterBar lives on the home page, so this doubles as a
// reminder plus a link back home to change the selection.
// -----------------------------------------------------------------------------

export default function FilterSummary() {
  const { part, categories } = useFilter()

  const partText = part === 'all' ? 'Kaikki osat' : partLabel(part)
  const categoryText =
    categories.length === 0 ? 'Kaikki aihepiirit' : categories.map(categoryLabel).join(', ')

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
      <span className="text-slate-600">
        {partText} · {categoryText}
      </span>
      {/* Send the user home to adjust the shared filter. */}
      <Link to="/" className="font-medium text-brand-700 underline underline-offset-2">
        Muuta
      </Link>
    </div>
  )
}

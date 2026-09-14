import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'

// -----------------------------------------------------------------------------
// FilterTag
// -----------------------------------------------------------------------------
// A compact, read-only pill showing the active filter (e.g. "Min bransch · ICT")
// at the top of a module. The full filter controls live on the home page; this
// is just a reminder of what's currently in scope.
// -----------------------------------------------------------------------------

export default function FilterTag() {
  const { part, categories } = useFilter()
  const { partLabel, categoryLabel } = useLanguage()

  const parts = []
  if (part !== 'all') parts.push(partLabel(part))
  if (categories.length > 0) parts.push(categories.map(categoryLabel).join(', '))

  // Nothing narrowed -> show a neutral "all" tag.
  const text = parts.length ? parts.join(' · ') : 'Kaikki'

  return (
    <span className="inline-block rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
      {text}
    </span>
  )
}

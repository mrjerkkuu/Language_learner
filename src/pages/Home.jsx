import { Link } from 'react-router-dom'
import vocabulary from '../data/vocabulary.json'
import phrases from '../data/phrases.json'
import writingTasks from '../data/writingTasks.json'
import { useFilter } from '../context/FilterContext'
import FilterBar from '../components/FilterBar'
import ProgressStats from '../components/ProgressStats'

// -----------------------------------------------------------------------------
// Home page
// -----------------------------------------------------------------------------
// The home page is a MENU, not content: a global filter at the top, a progress
// summary, and one card per module. Each card shows a live content counter for
// the current filter, and is disabled (with an empty-state hint) when the filter
// leaves that module with nothing to practise.
// -----------------------------------------------------------------------------

// Module definitions. `data` is the source array used only to count how many
// items match the current filter (the module itself does the real work).
const MODULES = [
  { to: '/flashcards', title: 'Flashcards', desc: 'Sanaston kertaus korteilla', data: vocabulary, unit: 'korttia' },
  { to: '/phrases', title: 'Fraasipankki', desc: 'Small talk & viestintäfraasit', data: phrases, unit: 'fraasia' },
  { to: '/writing', title: 'Kirjoitusharjoitus', desc: 'Kirjoita ja vertaa mallivastaukseen', data: writingTasks, unit: 'tehtävää' },
  { to: '/quiz', title: 'Quiz', desc: 'Testaa muistamista', data: vocabulary, unit: 'sanaa' },
]

export default function Home() {
  const { filterItems } = useFilter()

  return (
    <div className="space-y-6">
      {/* Global filter — the single source of truth shared by every module. */}
      <FilterBar />

      {/* Progress + activity summary. */}
      <ProgressStats />

      {/* Module cards with live counters. */}
      <div className="grid gap-3">
        {MODULES.map((m) => {
          const count = filterItems(m.data).length
          return <ModuleCard key={m.to} module={m} count={count} />
        })}
      </div>
    </div>
  )
}

// A single module card. When `count` is 0, the card is not a link and shows an
// empty-state hint instead of navigating to a module with nothing in it.
function ModuleCard({ module, count }) {
  const disabled = count === 0

  const inner = (
    <div
      className={
        'flex items-center justify-between rounded-2xl p-4 shadow-sm ring-1 transition-colors ' +
        (disabled
          ? 'bg-slate-50 ring-slate-200'
          : 'bg-white ring-slate-200 active:bg-brand-50')
      }
    >
      <div>
        <div className={'font-semibold ' + (disabled ? 'text-slate-400' : 'text-slate-900')}>
          {module.title}
        </div>
        <div className="text-sm text-slate-500">{module.desc}</div>
      </div>
      <div className="ml-3 shrink-0 text-right">
        {disabled ? (
          <span className="text-sm text-slate-400">Ei sisältöä</span>
        ) : (
          <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
            {count} {module.unit}
          </span>
        )}
      </div>
    </div>
  )

  // Disabled cards are plain (non-clickable) divs.
  if (disabled) return inner
  return <Link to={module.to}>{inner}</Link>
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import vocabulary from '../data/vocabulary.json'
import phrases from '../data/phrases.json'
import writingTasks from '../data/writingTasks.json'
import { useFilter } from '../context/FilterContext'
import { useActivityLog } from '../hooks/useActivityLog'
import Layout from '../components/Layout'
import FilterBar from '../components/FilterBar'
import MotivationBar from '../components/MotivationBar'
import StreakSheet from '../components/StreakSheet'

// -----------------------------------------------------------------------------
// Home page (menu)
// -----------------------------------------------------------------------------
// A menu, not content: title, the colourful motivation bar (opens the streak
// sheet), the global filter, and one row per module with a live per-filter
// counter. A module row is disabled when the filter leaves it empty.
// -----------------------------------------------------------------------------

const MODULES = [
  { to: '/flashcards', title: 'Sanakortit', data: vocabulary },
  { to: '/phrases', title: 'Fraasipankki', data: phrases },
  { to: '/writing', title: 'Kirjoitus', data: writingTasks },
  { to: '/quiz', title: 'Quiz', data: vocabulary },
]

export default function Home() {
  const { filterItems } = useFilter()
  const { getSummary } = useActivityLog()
  const [sheetOpen, setSheetOpen] = useState(false)

  const activity = getSummary()

  return (
    <Layout>
      <div className="space-y-5">
        {/* Title block */}
        <div>
          <div className="text-sm text-muted">Työelämän ruotsi</div>
          <h1 className="font-display text-3xl font-bold text-ink">Harjoittele</h1>
        </div>

        {/* Colourful motivation bar -> opens the streak sheet. */}
        <MotivationBar onOpen={() => setSheetOpen(true)} />

        {/* Global filter. */}
        <FilterBar />

        {/* Module list. */}
        <div className="space-y-2">
          {MODULES.map((m) => (
            <ModuleRow key={m.to} module={m} count={filterItems(m.data).length} />
          ))}
        </div>

        {/* Footer activity line. */}
        <p className="pt-2 text-center text-sm text-muted">
          Harjoiteltu {activity.activeDaysThisWeek} kertaa tällä viikolla
        </p>
      </div>

      {/* The bottom sheet lives here but only renders when open. */}
      <StreakSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Layout>
  )
}

// One module row: colored marker + name on the left, counter + chevron on the
// right. Disabled (non-clickable, muted) when the filter leaves it empty.
function ModuleRow({ module, count }) {
  const disabled = count === 0

  const inner = (
    <div
      className={
        'flex items-center justify-between rounded-[14px] p-4 ring-1 transition-colors ' +
        (disabled ? 'bg-card/60 ring-line' : 'bg-card ring-line active:bg-bg')
      }
    >
      <div className="flex items-center gap-3">
        <span className={'h-2.5 w-2.5 rounded-sm ' + (disabled ? 'bg-line' : 'bg-accent')} />
        <span className={'font-medium ' + (disabled ? 'text-muted' : 'text-ink')}>
          {module.title}
        </span>
      </div>
      <div className="flex items-center gap-2 text-muted">
        <span className="text-sm">{count}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )

  if (disabled) return inner
  return <Link to={module.to}>{inner}</Link>
}

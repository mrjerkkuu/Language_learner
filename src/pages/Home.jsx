import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useActivityLog } from '../hooks/useActivityLog'
import Layout from '../components/Layout'
import FilterBar from '../components/FilterBar'
import MotivationBar from '../components/MotivationBar'
import StreakSheet from '../components/StreakSheet'

// -----------------------------------------------------------------------------
// Home page (menu)
// -----------------------------------------------------------------------------
// A menu: language switcher, the colourful motivation bar (opens the streak
// sheet), the global filter, and one row per module with a live per-filter
// counter. A module row is disabled when the filter leaves it empty.
// -----------------------------------------------------------------------------

export default function Home() {
  const { filterItems } = useFilter()
  const { content, lang, setLang, languages } = useLanguage()
  const { getSummary } = useActivityLog()
  const [sheetOpen, setSheetOpen] = useState(false)

  const activity = getSummary()

  // Module rows use the current language's content for the live counters.
  const modules = [
    { to: '/flashcards', title: 'Sanakortit', data: content.vocabulary },
    { to: '/phrases', title: 'Fraasipankki', data: content.phrases },
    { to: '/writing', title: 'Kirjoitus', data: content.writingTasks },
    { to: '/quiz', title: 'Quiz', data: content.vocabulary },
    { to: '/forms', title: 'Muodot', data: content.wordForms },
  ]

  return (
    <Layout>
      <div className="space-y-5">
        {/* Title + language switcher */}
        <div>
          <div className="text-sm text-muted">Kieliharjoittelu</div>
          <h1 className="font-display text-3xl font-bold text-ink">Harjoittele</h1>
        </div>

        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 py-1.5">
          <div className="flex w-max gap-2">
            {languages.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                aria-pressed={l.id === lang}
                className={
                  'touch-target rounded-full px-4 text-sm font-semibold transition-colors ' +
                  (l.id === lang ? 'bg-ink text-white' : 'bg-card text-ink ring-1 ring-line active:bg-bg')
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colourful motivation bar -> opens the streak sheet. */}
        <MotivationBar onOpen={() => setSheetOpen(true)} />

        {/* Global filter. */}
        <FilterBar />

        {/* Module list. */}
        <div className="space-y-4">
          {modules.map((m) => (
            <ModuleRow key={m.to} module={m} count={filterItems(m.data).length} />
          ))}
        </div>

        <p className="pt-2 text-center text-sm text-muted">
          Harjoiteltu {activity.activeDaysThisWeek} kertaa tällä viikolla
        </p>
      </div>

      <StreakSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Layout>
  )
}

function ModuleRow({ module, count }) {
  const disabled = count === 0
  const inner = (
    <div
      className={
        'flex items-center justify-between rounded-[14px] p-4 shadow-sm ring-1 transition-colors ' +
        (disabled ? 'bg-card/60 ring-line' : 'bg-card ring-line active:bg-bg')
      }
    >
      <div className="flex items-center gap-3">
        <span className={'h-2.5 w-2.5 rounded-sm ' + (disabled ? 'bg-line' : 'bg-accent')} />
        <span className={'font-medium ' + (disabled ? 'text-muted' : 'text-ink')}>{module.title}</span>
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

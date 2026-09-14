import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useActivityLog } from '../hooks/useActivityLog'
import { useTheme } from '../hooks/useTheme'
import Layout from '../components/Layout'
import FilterBar from '../components/FilterBar'
import MotivationBar from '../components/MotivationBar'
import StreakSheet from '../components/StreakSheet'
import { ROUTES } from '../lib/routes'

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
  const { isDark, toggle } = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)

  const activity = getSummary()

  // Module rows use the current language's content for the live counters.
  const modules = [
    { to: ROUTES.flashcards, title: 'Sanakortit', data: content.vocabulary },
    { to: ROUTES.phrases, title: 'Fraasipankki', data: content.phrases },
    { to: ROUTES.writing, title: 'Kirjoitus', data: content.writingTasks },
    { to: ROUTES.quiz, title: 'Quiz', data: content.vocabulary },
    { to: ROUTES.forms, title: 'Muodot', data: content.wordForms },
  ]

  return (
    <Layout>
      <div className="space-y-5">
        {/* Title + theme toggle */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted">Kieliharjoittelu</div>
            <h1 className="font-display text-3xl font-bold text-ink">Harjoittele</h1>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan'}
            className="touch-target -mr-2 flex items-center justify-center rounded-xl text-ink active:bg-line/60"
          >
            {isDark ? (
              // Sun (switch to light)
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              // Moon (switch to dark)
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            )}
          </button>
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
                  (l.id === lang ? 'bg-accent text-white' : 'bg-card text-ink ring-1 ring-line active:bg-bg')
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

        {/* Module list. Flex column + gap so spacing works reliably: the rows
            are <Link>/<a> (inline by default), and vertical margins (space-y-*)
            are ignored on inline elements — flex items get blockified, so gap
            always applies. */}
        <div className="flex flex-col gap-[7px]">
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
        'flex items-center justify-between rounded-[14px] p-4 ring-1 transition-colors ' +
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

import { useMemo, useState } from 'react'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useActivityLog } from '../hooks/useActivityLog'
import Layout from './Layout'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Fraasipankki (Phrase bank) module
// -----------------------------------------------------------------------------
// A filterable list of phrases. Each row shows the Swedish phrase; tap it to
// reveal the Finnish translation (tap again to hide). Unrevealed rows show a
// "Näytä ›" hint. Category chips at the top adjust the (shared) topic filter.
// -----------------------------------------------------------------------------

export default function PhraseBank() {
  const { filterItems, categories, toggleCategory, clearFilters } = useFilter()
  const { content } = useLanguage()
  const { logActivity } = useActivityLog()

  const list = useMemo(() => filterItems(content.phrases), [filterItems, content])
  const [revealed, setRevealed] = useState(() => new Set())

  function toggle(id) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        logActivity(1)
      }
      return next
    })
  }

  return (
    <Layout back title="Fraasipankki" right={list.length}>
      <div className="space-y-4">
        {/* Category chips (topic filter). "Kaikki" clears the topic selection. */}
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            <Chip active={categories.length === 0} onClick={clearFilters}>
              Kaikki
            </Chip>
            {content.CATEGORIES.map((c) => (
              <Chip key={c.id} active={categories.includes(c.id)} onClick={() => toggleCategory(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState title="Ei fraaseja" />
        ) : (
          <ul className="space-y-2">
            {list.map((phrase) => {
              const isRevealed = revealed.has(phrase.id)
              return (
                <li key={phrase.id}>
                  <button
                    type="button"
                    onClick={() => toggle(phrase.id)}
                    aria-expanded={isRevealed}
                    className="w-full rounded-2xl border border-line bg-card p-4 text-left active:bg-bg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-ink">{phrase.term}</span>
                      {!isRevealed && (
                        <span className="shrink-0 text-sm font-medium text-accent">Näytä ›</span>
                      )}
                    </div>
                    {isRevealed && <div className="mt-2 text-muted">{phrase.fi}</div>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-center text-sm text-muted">Napauta fraasia nähdäksesi käännöksen</p>
      </div>
    </Layout>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'touch-target whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors ' +
        (active ? 'bg-accent text-white' : 'bg-card text-muted ring-1 ring-line active:bg-bg')
      }
    >
      {children}
    </button>
  )
}

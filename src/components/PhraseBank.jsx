import { useMemo, useState } from 'react'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useActivityLog } from '../hooks/useActivityLog'
import { categoriesForPart } from '../lib/categoryFilter'
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
  const { filterItems, part, categories, toggleCategory, clearFilters } = useFilter()
  const { content } = useLanguage()
  const { logActivity } = useActivityLog()

  const list = useMemo(() => filterItems(content.phrases), [filterItems, content])
  // Only chips for categories that actually occur among phrases for the
  // selected area — e.g. "ICT" phrases won't show a chip under part 1.
  const visibleCategories = useMemo(
    () => categoriesForPart(content.phrases, part, content.CATEGORIES),
    [content, part],
  )
  const [revealed, setRevealed] = useState(() => new Set())

  function toggle(id) {
    const willReveal = !revealed.has(id)
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Side effect kept OUT of the setState updater above: React may invoke an
    // updater function more than once for one state change (e.g. Strict
    // Mode's dev-only double-invoke), and calling another context's setState
    // from inside it triggers "Cannot update a component while rendering a
    // different component" — see PhraseBank's earlier logActivity-in-updater
    // bug, which double-posted /api/activity/record for a single reveal.
    if (willReveal) logActivity(1)
  }

  return (
    <Layout back title="Fraasipankki" right={list.length}>
      <div className="space-y-4">
        {/* Category chips (topic filter). Unlike FilterBar's topic row (which
            hides under "Kaikki" since there's nothing to narrow down to on
            the Home page), PhraseBank always shows its chips — the phrase
            count has grown large enough (180+) that browsing by category is
            useful even without an area selected first (see E1 in
            claude/tulevat-muutokset.md). "Kaikki" here clears the topic
            selection (not the area). */}
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 py-1.5">
          <div className="flex w-max gap-2">
            <Chip active={categories.length === 0} onClick={clearFilters}>
              Kaikki
            </Chip>
            {visibleCategories.map((c) => (
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
                    {isRevealed && phrase.note && (
                      <div className="mt-1 text-xs text-muted/70">{phrase.note}</div>
                    )}
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
        (active
          ? 'bg-accent-soft text-accent ring-1 ring-accent/30'
          : 'bg-card text-muted ring-1 ring-line active:bg-bg')
      }
    >
      {children}
    </button>
  )
}

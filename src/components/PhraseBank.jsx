import { useMemo, useState } from 'react'
import phrases from '../data/phrases.json'
import { useFilter } from '../context/FilterContext'
import { useActivityLog } from '../hooks/useActivityLog'
import { categoryLabel, partLabel } from '../data/categories'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// PhraseBank module
// -----------------------------------------------------------------------------
// A filterable list of useful phrases. Each row shows the Swedish phrase; tap
// it to reveal the Finnish translation (tap again to hide). This "tap-to-reveal"
// pattern lets you self-test: read the Swedish, guess the meaning, then check.
// -----------------------------------------------------------------------------

export default function PhraseBank() {
  const { filterItems } = useFilter()
  const { logActivity } = useActivityLog()

  // Phrases matching the current global filter.
  const list = useMemo(() => filterItems(phrases), [filterItems])

  // Which phrase ids are currently revealed. A Set is a natural fit for
  // "is this id revealed?" membership checks.
  const [revealed, setRevealed] = useState(() => new Set())

  function toggle(id) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        logActivity(1) // count a reveal as one practised item
      }
      return next
    })
  }

  if (list.length === 0) {
    return (
      <EmptyState
        title="Ei fraaseja tällä suodattimella"
        hint="Valitse toinen osa tai aihepiiri ylhäältä."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {list.map((phrase) => {
        const isRevealed = revealed.has(phrase.id)
        return (
          <li key={phrase.id}>
            {/* The whole row is a button so any tap toggles the translation. */}
            <button
              type="button"
              onClick={() => toggle(phrase.id)}
              aria-expanded={isRevealed}
              className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-slate-900">{phrase.sv}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {partLabel(phrase.part)} · {categoryLabel(phrase.category)}
                </span>
              </div>

              {/* Revealed translation, or a subtle hint when hidden. */}
              {isRevealed ? (
                <div className="mt-2 text-brand-700">{phrase.fi}</div>
              ) : (
                <div className="mt-2 text-sm text-slate-400">Napauta nähdäksesi käännöksen</div>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

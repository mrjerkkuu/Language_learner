import { useMemo } from 'react'
import vocabulary from '../data/vocabulary.json'
import { PARTS } from '../data/categories'
import { useFilter } from '../context/FilterContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'

// -----------------------------------------------------------------------------
// ProgressStats
// -----------------------------------------------------------------------------
// Summary of progress, shown on the home page. All numbers are derived directly
// from the spaced-repetition data + activity log in localStorage.
//
//   - Learned within the current filter:   "34 / 120 sanaa opittu"
//   - Per Del breakdown:                    "Del 1: 18 / 25 opittu"
//   - Difficult words within the filter:    "Vaikeat sanat: N"
//   - Activity summary:                     "Harjoiteltu tänään / tällä viikolla"
//
// The per-Del breakdown respects the category selection but always shows all
// three parts, so you can see whether you're ready to move on to the next Del.
// -----------------------------------------------------------------------------

export default function ProgressStats() {
  const { filterItems, categories } = useFilter()
  const { computeStats } = useSpacedRepetition()
  const { getSummary } = useActivityLog()

  // Vocabulary matching the FULL current filter (part + category).
  const filtered = useMemo(() => filterItems(vocabulary), [filterItems])
  const stats = computeStats(filtered)

  // Per-Del stats: apply only the category selection, then split by part.
  const perDel = useMemo(() => {
    const byCategory = vocabulary.filter(
      (w) => categories.length === 0 || categories.includes(w.category),
    )
    return PARTS.map((p) => ({
      part: p,
      stats: computeStats(byCategory.filter((w) => w.part === p.id)),
    }))
  }, [categories, computeStats])

  const activity = getSummary()

  return (
    <div className="space-y-3">
      {/* Headline tiles: learned + difficult within the current filter. */}
      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Opittu (suodatin)"
          value={`${stats.learned} / ${stats.total}`}
          tone="green"
        />
        <Tile label="Vaikeat sanat" value={stats.difficult} tone="rose" />
      </div>

      {/* Per-Del learned breakdown. */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Edistyminen osittain
        </div>
        <ul className="space-y-2">
          {perDel.map(({ part, stats: s }) => {
            const pct = s.total === 0 ? 0 : Math.round((s.learned / s.total) * 100)
            return (
              <li key={part.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{part.label}</span>
                  <span className="text-slate-500">
                    {s.learned} / {s.total} opittu
                  </span>
                </div>
                {/* Simple progress bar. */}
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Activity summary. */}
      <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
        <div>
          Harjoiteltu tänään: <strong className="text-slate-900">{activity.todayCount}</strong>{' '}
          sanaa
        </div>
        <div className="mt-1">
          Tällä viikolla:{' '}
          <strong className="text-slate-900">{activity.weekCount}</strong> sanaa (
          {activity.activeDaysThisWeek} päivänä)
        </div>
      </div>
    </div>
  )
}

// Small stat tile with a colored value.
function Tile({ label, value, tone }) {
  const toneClass = tone === 'green' ? 'text-green-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-900'
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}

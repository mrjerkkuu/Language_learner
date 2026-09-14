import { useMemo } from 'react'
import vocabulary from '../data/vocabulary.json'
import { PARTS } from '../data/categories'
import { useFilter } from '../context/FilterContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'

// -----------------------------------------------------------------------------
// StreakSheet
// -----------------------------------------------------------------------------
// Bottom sheet opened from the MotivationBar. Shows the current streak + best
// streak, three stat boxes (learned / difficult / this week), and per-area
// learned progress bars. All numbers come straight from localStorage.
//
// Props: open (bool), onClose (fn).
// -----------------------------------------------------------------------------

export default function StreakSheet({ open, onClose }) {
  const { filterItems, categories } = useFilter()
  const { computeStats } = useSpacedRepetition()
  const { getSummary } = useActivityLog()

  // Top boxes respect the active filter (consistent with the motivation bar).
  const stats = useMemo(() => computeStats(filterItems(vocabulary)), [filterItems, computeStats])

  // Per-area progress: apply only the category selection, then split by area.
  const perArea = useMemo(() => {
    const byCategory = vocabulary.filter(
      (w) => categories.length === 0 || categories.includes(w.category),
    )
    return PARTS.map((p) => ({
      area: p,
      stats: computeStats(byCategory.filter((w) => w.part === p.id)),
    }))
  }, [categories, computeStats])

  const activity = getSummary()

  if (!open) return null

  return (
    // Full-screen overlay; clicking the backdrop closes the sheet.
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="animate-fade absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* The sheet panel itself. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edistyminen"
        className="animate-sheet app-safe relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-5"
      >
        {/* Grab handle */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />

        {/* Streak headline */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-streak font-display text-xl font-bold text-white">
            {activity.currentStreak}
          </div>
          <div>
            <div className="font-display text-lg font-bold text-ink">
              {activity.currentStreak} päivää putkea
            </div>
            <div className="text-sm text-muted">Paras putki: {activity.bestStreak} päivää</div>
          </div>
        </div>

        {/* Three stat boxes */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          <StatBox value={stats.learned} label="opittu" />
          <StatBox value={stats.difficult} label="vaikeaa" />
          <StatBox value={`${activity.activeDaysThisWeek}×`} label="tällä vk" />
        </div>

        {/* Per-area learned progress (green bars) */}
        <div className="mb-5 space-y-3">
          {perArea.map(({ area, stats: s }) => {
            const pct = s.total === 0 ? 0 : Math.round((s.learned / s.total) * 100)
            return (
              <div key={area.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink">{area.label}</span>
                  <span className="text-muted">
                    {s.learned} / {s.total}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-learned" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
        >
          Sulje
        </button>
      </div>
    </div>
  )
}

function StatBox({ value, label }) {
  return (
    <div className="rounded-xl bg-bg p-3 text-center">
      <div className="font-display text-xl font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  )
}

import { useMemo } from 'react'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'

// -----------------------------------------------------------------------------
// MotivationBar
// -----------------------------------------------------------------------------
// The single colourful element of the home page: a gradient bar showing
// learned/difficult counts on the left and a warm streak badge on the right.
// The WHOLE bar is a button that opens the streak bottom sheet (onOpen).
//
// Counts respect the active filter (like the rest of the app).
// -----------------------------------------------------------------------------

export default function MotivationBar({ onOpen }) {
  const { filterItems } = useFilter()
  const { content } = useLanguage()
  const { computeStats } = useSpacedRepetition()
  const { getSummary } = useActivityLog()

  const stats = useMemo(
    () => computeStats(filterItems(content.vocabulary)),
    [filterItems, computeStats, content],
  )
  const { currentStreak } = getSummary()

  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-motivation flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left text-white active:brightness-95"
    >
      {/* Left: learned + difficult counters */}
      <div className="flex items-center gap-5">
        <div>
          <div className="font-display text-2xl font-bold leading-none">
            {stats.learned}
            <span className="text-base font-medium text-white/80">/{stats.total}</span>
          </div>
          <div className="mt-1 text-xs text-white/80">opittu</div>
        </div>
        <div>
          <div className="font-display text-2xl font-bold leading-none">{stats.difficult}</div>
          <div className="mt-1 text-xs text-white/80">vaikeaa</div>
        </div>
      </div>

      {/* Right: warm streak badge */}
      <div className="flex items-center gap-1 rounded-full bg-streak px-3 py-1.5 font-display font-bold">
        <span>{currentStreak}</span>
        <span aria-hidden="true">›</span>
      </div>
    </button>
  )
}

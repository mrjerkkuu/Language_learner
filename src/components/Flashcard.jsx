import { useState, useEffect, useMemo } from 'react'
import vocabulary from '../data/vocabulary.json'
import { useFilter } from '../context/FilterContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import { categoryLabel, partLabel } from '../data/categories'
import SwipeableCard from './SwipeableCard'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Flashcard module
// -----------------------------------------------------------------------------
// Practises vocabulary. Shows the Swedish word; tap to flip to the Finnish
// meaning + an example sentence; then rate how well you knew it. The rating
// feeds the spaced-repetition engine, which chooses which card comes next.
//
// Rating maps to the 3-level self-assessment:
//   swipe LEFT  / "Vaikea"    -> hard
//   button      / "Keskitaso" -> medium
//   swipe RIGHT / "Helppo"    -> easy
// -----------------------------------------------------------------------------

// Colours for the small status badge (new / in progress / learned).
const STATUS_STYLE = {
  new: { label: 'Uusi', className: 'bg-slate-100 text-slate-600' },
  inProgress: { label: 'Kesken', className: 'bg-amber-100 text-amber-700' },
  learned: { label: 'Opittu', className: 'bg-green-100 text-green-700' },
}

export default function Flashcard() {
  const { filterItems } = useFilter()
  const { pickNext, recordAssessment, getStatus } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  // The pool of cards matching the current global filter. Recomputed whenever
  // the filter changes.
  const pool = useMemo(() => filterItems(vocabulary), [filterItems])

  const [current, setCurrent] = useState(null)
  const [flipped, setFlipped] = useState(false)

  // Pick a first card, and re-pick if the filter change removed the current one.
  // We intentionally depend only on `pool`: re-picking on every SR data change
  // is unnecessary because the current card stays valid until we advance.
  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null)
      return
    }
    setCurrent((prev) => {
      if (prev && pool.some((c) => c.id === prev.id)) return prev // still valid
      return pickNext(pool)
    })
    setFlipped(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  // Record the rating, log activity, and advance to the next card.
  function handleRate(level) {
    if (!current) return
    recordAssessment(current.id, level)
    logActivity(1)
    setCurrent(pickNext(pool, current.id)) // exclude current so it doesn't repeat
    setFlipped(false)
  }

  if (pool.length === 0) {
    return (
      <EmptyState
        title="Ei sanoja tällä suodattimella"
        hint="Valitse toinen osa tai aihepiiri ylhäältä."
      />
    )
  }

  if (!current) return null

  const status = STATUS_STYLE[getStatus(current.id)] ?? STATUS_STYLE.new

  return (
    <div>
      {/* Small meta row: how many cards are in the current pool. */}
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>{pool.length} korttia suodattimessa</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* The card itself. Swiping left/right rates hard/easy; tapping flips it. */}
      <SwipeableCard
        onSwipeLeft={() => handleRate('hard')}
        onSwipeRight={() => handleRate('easy')}
        onTap={() => setFlipped((f) => !f)}
      >
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-md ring-1 ring-slate-200">
          {/* Tag row: which part + category this word belongs to. */}
          <div className="mb-4 flex gap-2 text-xs text-slate-400">
            <span>{partLabel(current.part)}</span>
            <span>·</span>
            <span>{categoryLabel(current.category)}</span>
          </div>

          {!flipped ? (
            // FRONT: Swedish word.
            <>
              <div className="text-3xl font-bold text-slate-900">{current.sv}</div>
              <div className="mt-4 text-sm text-slate-400">Napauta nähdäksesi käännöksen</div>
            </>
          ) : (
            // BACK: Finnish meaning + example sentence.
            <>
              <div className="text-2xl font-semibold text-brand-700">{current.fi}</div>
              <div className="mt-3 text-base italic text-slate-600">
                {current.example_sv}
              </div>
            </>
          )}
        </div>
      </SwipeableCard>

      {/* Rating buttons (the tap-friendly alternative to swiping). */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <RateButton onClick={() => handleRate('hard')} className="bg-rose-100 text-rose-700">
          Vaikea
        </RateButton>
        <RateButton onClick={() => handleRate('medium')} className="bg-amber-100 text-amber-700">
          Keskitaso
        </RateButton>
        <RateButton onClick={() => handleRate('easy')} className="bg-green-100 text-green-700">
          Helppo
        </RateButton>
      </div>
    </div>
  )
}

// Full-width, 44px-tall rating button.
function RateButton({ onClick, className, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-target rounded-xl py-3 text-sm font-semibold active:brightness-95 ${className}`}
    >
      {children}
    </button>
  )
}

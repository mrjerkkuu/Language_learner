import { useState, useEffect, useMemo } from 'react'
import vocabulary from '../data/vocabulary.json'
import { useFilter } from '../context/FilterContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import Layout from './Layout'
import FilterTag from './FilterTag'
import SwipeableCard from './SwipeableCard'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Sanakortit (Flashcards) module
// -----------------------------------------------------------------------------
// Shows the Swedish word; tap to flip to the Finnish meaning + example; then
// rate. Rating feeds spaced repetition, which picks the next card.
//   swipe LEFT  / "Vaikea"    -> hard
//   button      / "Keskitaso" -> medium
//   swipe RIGHT / "Helppo"    -> easy
// -----------------------------------------------------------------------------

export default function Flashcard() {
  const { filterItems } = useFilter()
  const { pickNext, recordAssessment, getStatus } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  const pool = useMemo(() => filterItems(vocabulary), [filterItems])

  const [current, setCurrent] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0) // cards rated this session (for the header progress)

  // Pick the first card / re-pick if the filter change removed the current one.
  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null)
      return
    }
    setCurrent((prev) => (prev && pool.some((c) => c.id === prev.id) ? prev : pickNext(pool)))
    setFlipped(false)
    setReviewed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  function handleRate(level) {
    if (!current) return
    recordAssessment(current.id, level)
    logActivity(1)
    setReviewed((n) => n + 1)
    setCurrent(pickNext(pool, current.id))
    setFlipped(false)
  }

  // Header counter/progress: how many rated so far, out of the pool size.
  const done = Math.min(reviewed, pool.length)
  const rightText = pool.length ? `${done}/${pool.length}` : null
  const progress = pool.length ? done / pool.length : null

  return (
    <Layout back title="Sanakortit" right={rightText} progress={progress}>
      {pool.length === 0 ? (
        <EmptyState title="Ei kortteja" />
      ) : !current ? null : (
        <div className="space-y-4">
          <FilterTag />

          {/* The card. Swipe left/right = hard/easy; tap = flip. */}
          <SwipeableCard
            onSwipeLeft={() => handleRate('hard')}
            onSwipeRight={() => handleRate('easy')}
            onTap={() => setFlipped((f) => !f)}
          >
            <div className="relative flex min-h-64 flex-col items-center justify-center rounded-2xl border border-line bg-card p-6 text-center">
              {/* Learned badge (top-right) */}
              {getStatus(current.id) === 'learned' && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-learned-soft px-2 py-0.5 text-xs font-semibold text-learned">
                  <span className="h-1.5 w-1.5 rounded-full bg-learned" /> Opittu
                </span>
              )}

              {!flipped ? (
                <>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Svenska
                  </div>
                  <div className="font-display text-3xl font-bold text-ink">{current.sv}</div>
                  <div className="mt-4 text-sm text-muted">Napauta kääntääksesi</div>
                </>
              ) : (
                <>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Suomeksi
                  </div>
                  <div className="font-display text-3xl font-bold text-ink">{current.fi}</div>
                  <div className="mt-3 text-base italic text-muted">{current.example_sv}</div>
                </>
              )}
            </div>
          </SwipeableCard>

          {/* Three ratings */}
          <div className="grid grid-cols-3 gap-2">
            <RateButton onClick={() => handleRate('hard')} chevron="‹" label="Vaikea" />
            <RateButton onClick={() => handleRate('medium')} label="Keskitaso" emphasize />
            <RateButton onClick={() => handleRate('easy')} chevron="›" label="Helppo" chevronRight />
          </div>

          <p className="text-center text-sm text-muted">Pyyhkäise ‹ vaikea · helppo ›</p>
        </div>
      )}
    </Layout>
  )
}

// One rating button. `emphasize` gives the middle button an accent outline.
function RateButton({ onClick, label, chevron, chevronRight, emphasize }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'touch-target flex flex-col items-center justify-center rounded-xl border bg-card py-3 text-sm font-semibold text-ink active:bg-bg ' +
        (emphasize ? 'border-accent text-accent' : 'border-line')
      }
    >
      {chevron && !chevronRight && <span className="text-base leading-none text-muted">{chevron}</span>}
      <span>{label}</span>
      {chevron && chevronRight && <span className="text-base leading-none text-muted">{chevron}</span>}
    </button>
  )
}

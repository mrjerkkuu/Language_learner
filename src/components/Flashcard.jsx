import { useState, useEffect, useMemo } from 'react'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import Layout from './Layout'
import FilterTag from './FilterTag'
import SwipeableCard from './SwipeableCard'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Sanakortit (Flashcards) module
// -----------------------------------------------------------------------------
// Shows a word in the target language; tap to flip (a real 3D flip) to the
// Finnish meaning + example. Then mark whether you knew it: Oikein / Väärin —
// via the buttons OR by swiping (right = Oikein, left = Väärin).
//
// The result feeds spaced repetition (correct lowers the review weight, wrong
// raises it), so "easy/hard" is derived automatically from how you do.
// -----------------------------------------------------------------------------

export default function Flashcard() {
  const { filterItems } = useFilter()
  const { content, language, partLabel, categoryLabel } = useLanguage()
  const { pickNext, recordResult, getStatus } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  const pool = useMemo(() => filterItems(content.vocabulary), [filterItems, content])

  const [current, setCurrent] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)

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

  // Mark the current card correct/wrong, then advance.
  // We reset `flipped` to false AND swap to the next card. The card below is
  // keyed by current.id, so advancing mounts a FRESH card showing its front
  // instantly (no flip-back animation). That's important: if we animated the
  // old card back to front while the content had already changed, the next
  // card's answer would be briefly readable during the 450ms rotation.
  function mark(correct) {
    if (!current) return
    recordResult(current.id, correct)
    logActivity(1)
    setReviewed((n) => n + 1)
    setFlipped(false)
    setCurrent(pickNext(pool, current.id))
  }

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

          {/* Swipe right = Oikein, left = Väärin; tap = flip. */}
          <SwipeableCard
            onSwipeRight={() => mark(true)}
            onSwipeLeft={() => mark(false)}
            onTap={() => setFlipped((f) => !f)}
            leftLabel="← Väärin"
            rightLabel="Oikein →"
          >
            {/* key={current.id}: advancing to the next card remounts this
                block, so the new card appears front-first with no flip
                animation — the previous answer can't flash during a rotation. */}
            <div key={current.id} className="flip relative">
              {/* Learned badge stays put (doesn't rotate with the faces). */}
              {getStatus(current.id) === 'learned' && (
                <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-learned-soft px-2 py-0.5 text-xs font-semibold text-learned">
                  <span className="h-1.5 w-1.5 rounded-full bg-learned" /> Opittu
                </span>
              )}

              <div className={'flip-inner ' + (flipped ? 'is-flipped' : '')}>
                {/* FRONT: target-language word */}
                <div className="flip-face flex min-h-64 flex-col items-center justify-center rounded-2xl border border-line bg-card p-6 text-center">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    {language.nativeLabel}
                  </div>
                  <div className="font-display text-3xl font-bold text-ink">{current.term}</div>
                  <div className="mt-4 text-sm text-muted">Napauta kääntääksesi</div>
                </div>

                {/* BACK: Finnish meaning + example */}
                <div className="flip-face flip-back flex min-h-64 flex-col items-center justify-center rounded-2xl border border-line bg-card p-6 text-center">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Suomeksi
                  </div>
                  <div className="font-display text-3xl font-bold text-ink">{current.fi}</div>
                  {current.example && (
                    <div className="mt-3 text-base italic text-muted">{current.example}</div>
                  )}
                </div>
              </div>
            </div>
          </SwipeableCard>

          {/* Right / wrong buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => mark(false)}
              className="touch-target rounded-xl border border-line bg-card py-3 font-semibold text-wrong active:bg-bg"
            >
              Väärin
            </button>
            <button
              type="button"
              onClick={() => mark(true)}
              className="touch-target rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
            >
              Oikein
            </button>
          </div>

          <p className="text-center text-sm text-muted">Napauta korttia · pyyhkäise ← väärin · oikein →</p>

          {/* Small meta line: which area/topic this word belongs to. */}
          <p className="text-center text-xs text-muted">
            {partLabel(current.part)} · {categoryLabel(current.category)}
          </p>
        </div>
      )}
    </Layout>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import { useSessionSize } from '../hooks/useSessionSize'
import { STORAGE_KEYS } from '../lib/storageKeys'
import { ROUTES } from '../lib/routes'
import Layout from './Layout'
import FilterTag from './FilterTag'
import SwipeableCard from './SwipeableCard'
import EmptyState from './EmptyState'
import SessionSizePicker from './SessionSizePicker'

// -----------------------------------------------------------------------------
// Sanakortit (Flashcards) module
// -----------------------------------------------------------------------------
// Before every session the user picks its size (5/10/15/20, last choice
// remembered, see SessionSizePicker); nothing starts until "Aloita". A
// limited, weighted SESSION of that many cards is then built up front (see
// src/lib/sessionLogic.js): mostly difficult/old cards, a few learned ones so
// they keep cycling in, and a few never-seen cards (more if the other two
// buckets can't fill the session). Shows a word in the target
// language; tap to flip (a real 3D flip) to the Finnish meaning + example.
// Then mark whether you knew it: Oikein / Väärin — via the buttons OR by
// swiping (right = Oikein, left = Väärin).
//
// The result feeds spaced repetition (correct lowers the review weight, wrong
// raises it), so "easy/hard" is derived automatically from how you do. When
// the session is done, a result screen lists every word with how you did.
// -----------------------------------------------------------------------------

export default function Flashcard() {
  const { filterItems } = useFilter()
  const { content, language, partLabel, categoryLabel } = useLanguage()
  const { buildSession, recordResult, getStatus } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  const pool = useMemo(() => filterItems(content.vocabulary), [filterItems, content])

  const [sessionSize, setSessionSize] = useSessionSize(STORAGE_KEYS.flashcardSessionSize, 20)
  const [session, setSession] = useState([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [phase, setPhase] = useState('select') // 'select' | 'practice' | 'result'
  const [results, setResults] = useState([])

  // A changed filter (or a finished session) goes back to the size picker;
  // a session is only ever built by "Aloita".
  function backToSelect() {
    setSession([])
    setIndex(0)
    setFlipped(false)
    setPhase('select')
    setResults([])
  }

  useEffect(() => {
    backToSelect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  function startSession(size) {
    setSessionSize(size)
    setSession(buildSession(pool, size))
    setIndex(0)
    setFlipped(false)
    setResults([])
    setPhase('practice')
  }

  const current = session[index] ?? null

  // Mark the current card correct/wrong, then advance (or finish the session).
  // We reset `flipped` to false AND swap to the next card. The card below is
  // keyed by current.id, so advancing mounts a FRESH card showing its front
  // instantly (no flip-back animation). That's important: if we animated the
  // old card back to front while the content had already changed, the next
  // card's answer would be briefly readable during the 450ms rotation.
  function mark(correct) {
    if (!current) return
    recordResult(current.id, correct)
    logActivity(1)
    setResults((prev) => [...prev, { id: current.id, term: current.term, fi: current.fi, correct }])
    setFlipped(false)
    if (index < session.length - 1) {
      setIndex((i) => i + 1)
    } else {
      setPhase('result')
    }
  }

  if (pool.length === 0) {
    return (
      <Layout back title="Sanakortit">
        <div className="space-y-4">
          <FilterTag />
          <EmptyState title="Ei kortteja" />
        </div>
      </Layout>
    )
  }

  if (phase === 'select') {
    return (
      <Layout back title="Sanakortit">
        <div className="space-y-4">
          <FilterTag />
          <SessionSizePicker
            title="Montako korttia?"
            unit="korttia"
            initialSize={sessionSize}
            available={pool.length}
            onStart={startSession}
          />
        </div>
      </Layout>
    )
  }

  if (phase === 'result') {
    return <SessionResultScreen results={results} onNewSession={backToSelect} />
  }

  if (!current) return null

  const rightText = `${index + 1}/${session.length}`
  const progress = index / session.length

  return (
    <Layout back title="Sanakortit" right={rightText} progress={progress}>
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
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Suomeksi</div>
                <div className="font-display text-3xl font-bold text-ink">{current.fi}</div>
                {current.example && <div className="mt-3 text-base italic text-muted">{current.example}</div>}
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
    </Layout>
  )
}

function SessionResultScreen({ results, onNewSession }) {
  const total = results.length
  const correctCount = results.filter((r) => r.correct).length
  const wrongCount = total - correctCount

  return (
    <Layout back title="Sanakortit — tulos">
      <div className="space-y-4">
        <div className="bg-motivation rounded-2xl p-6 text-center text-white">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/80">Oikein</div>
          <div className="font-display text-5xl font-bold">
            {correctCount}
            <span className="text-2xl font-medium text-white/80">/{total}</span>
          </div>
          <div className="mt-2 text-sm text-white/90">
            {correctCount === total ? 'Täydellistä!' : 'Hyvää työtä! Kertaus kannattaa.'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card p-3 text-center ring-1 ring-line">
            <div className="font-display text-2xl font-bold text-learned">{correctCount}</div>
            <div className="text-xs text-muted">oikein</div>
          </div>
          <div className="rounded-xl bg-card p-3 text-center ring-1 ring-line">
            <div className="font-display text-2xl font-bold text-wrong">{wrongCount}</div>
            <div className="text-xs text-muted">väärin</div>
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-line">
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={`${r.id}-${i}`} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-semibold text-ink">{r.term}</span>
                  <span className="text-muted"> — {r.fi}</span>
                </span>
                <span className={'font-semibold ' + (r.correct ? 'text-learned' : 'text-wrong')}>
                  {r.correct ? 'oikein' : 'väärin'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* New session -> back to the size picker (remembered size preselected). */}
        <button
          type="button"
          onClick={onNewSession}
          className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
        >
          Uusi sessio
        </button>
        <Link
          to={ROUTES.app}
          className="touch-target block w-full rounded-xl border border-line bg-card py-3 text-center font-semibold text-ink active:bg-bg"
        >
          Valikkoon
        </Link>
      </div>
    </Layout>
  )
}

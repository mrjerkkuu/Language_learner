import { useState, useEffect, useMemo, useCallback } from 'react'
import vocabulary from '../data/vocabulary.json'
import fillBlanks from '../data/fillBlanks.json'
import { useFilter } from '../context/FilterContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import { generateDistractors } from '../services/aiService'
import { shuffle } from '../utils/shuffle'
import Layout from './Layout'
import FilterTag from './FilterTag'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Quiz module
// -----------------------------------------------------------------------------
// A whole SESSION of questions is asked, and — importantly — right/wrong is
// shown ONLY at the end on a dedicated result screen (never per answer).
//
// Question types (mixed into one session):
//   - 'mc'   : "Mikä on ruotsiksi <fi>?" -> pick the Swedish word (from vocabulary)
//   - 'fill' : fill the blank in a sentence (from fillBlanks)
//
// Which items are asked is weighted by spaced repetition (harder words appear
// more), and answers feed back into it (wrong answers raise the review weight).
//
// Distractors: same category+part first, then widen — sourced from the FULL
// data so narrow filters still yield 4 options. The generateDistractors() AI
// hook is tried first (returns null in the MVP -> fallback).
// -----------------------------------------------------------------------------

const SESSION_SIZE = 10 // questions per session (fewer if the pool is smaller)
const OPTION_COUNT = 4

export default function Quiz() {
  const { filterItems } = useFilter()
  const { getState, recordQuiz } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  // Candidate items for the current filter, tagged by question type.
  const candidates = useMemo(() => {
    const mc = filterItems(vocabulary).map((item) => ({ type: 'mc', item, id: item.id }))
    const fill = filterItems(fillBlanks).map((item) => ({ type: 'fill', item, id: item.id }))
    return [...mc, ...fill]
  }, [filterItems])

  const [session, setSession] = useState([]) // array of question objects
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([]) // selected option per question
  const [phase, setPhase] = useState('quiz') // 'quiz' | 'result'
  const [building, setBuilding] = useState(true)

  // Build a session from a set of candidates (weighted by SR weight).
  const startSession = useCallback(
    async (fromCandidates) => {
      setBuilding(true)
      const chosen = weightedSample(fromCandidates, SESSION_SIZE, (c) => getState(c.id).weight)
      const built = []
      for (const c of chosen) built.push(await buildQuestion(c))
      setSession(built)
      setAnswers(new Array(built.length).fill(null))
      setIndex(0)
      setPhase('quiz')
      setBuilding(false)
    },
    [getState],
  )

  // (Re)build whenever the candidate set (filter) changes.
  useEffect(() => {
    if (candidates.length === 0) {
      setSession([])
      setBuilding(false)
      return
    }
    startSession(candidates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates])

  // Record the tapped option (no correctness shown yet).
  function selectOption(option) {
    setAnswers((prev) => {
      const next = [...prev]
      next[index] = option
      return next
    })
  }

  // Advance, or finish the session (record results + show the result screen).
  function next() {
    if (index < session.length - 1) {
      setIndex((i) => i + 1)
      return
    }
    // Finish: feed every answer back into spaced repetition.
    session.forEach((q, i) => {
      const correct = answers[i] === q.correct
      recordQuiz(q.id, correct)
    })
    logActivity(session.length)
    setPhase('result')
  }

  if (candidates.length === 0) {
    return (
      <Layout back title="Quiz">
        <div className="space-y-4">
          <FilterTag />
          <EmptyState title="Ei kysymyksiä" />
        </div>
      </Layout>
    )
  }

  if (building || session.length === 0) {
    return (
      <Layout back title="Quiz">
        <p className="text-muted">Ladataan…</p>
      </Layout>
    )
  }

  // --- Result screen ---
  if (phase === 'result') {
    const wrong = session.filter((q, i) => answers[i] !== q.correct)
    const correctCount = session.length - wrong.length
    return (
      <ResultScreen
        total={session.length}
        correctCount={correctCount}
        wrong={wrong}
        onRetryWrong={() => startSession(wrong.map((q) => q.source))}
      />
    )
  }

  // --- Quiz screen ---
  const q = session[index]
  const selected = answers[index]
  const isLast = index === session.length - 1

  return (
    <Layout
      back
      title="Quiz"
      right={`${index + 1}/${session.length}`}
      progress={index / session.length}
    >
      <div className="space-y-4">
        <FilterTag />

        <div>
          {q.promptLabel && <p className="text-sm text-muted">{q.promptLabel}</p>}
          <p className="mt-1 font-display text-2xl font-bold text-ink">{q.prompt}</p>
        </div>

        {/* Options: selecting highlights with the accent, but no right/wrong. */}
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const chosen = opt === selected
            return (
              <button
                key={opt}
                type="button"
                onClick={() => selectOption(opt)}
                aria-pressed={chosen}
                className={
                  'touch-target rounded-xl border px-4 py-3 text-left text-base font-medium transition-colors ' +
                  (chosen
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-card text-ink active:bg-bg')
                }
              >
                {opt}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={selected == null}
          className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95 disabled:opacity-40"
        >
          {isLast ? 'Näytä tulokset' : 'Seuraava'}
        </button>
      </div>
    </Layout>
  )
}

// -----------------------------------------------------------------------------
// Result screen
// -----------------------------------------------------------------------------
function ResultScreen({ total, correctCount, wrong, onRetryWrong }) {
  const wrongCount = total - correctCount
  return (
    <Layout back title="Quiz — tulos">
      <div className="space-y-4">
        {/* Big gradient score card */}
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

        {/* Correct / wrong counters */}
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

        {/* Wrong words: explanation + list */}
        {wrongCount > 0 && (
          <div className="rounded-xl bg-card p-4 ring-1 ring-line">
            <p className="text-sm text-muted">
              {wrongCount} sanaa lisättiin kertaukseen — ne palaavat useammin sanakorteissa ja
              quizissä.
            </p>
            <ul className="mt-3 space-y-1">
              {wrong.map((q) => (
                <li key={q.id} className="flex justify-between text-sm">
                  <span className="text-ink">{q.correct}</span>
                  <span className="font-semibold text-wrong">väärin</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {wrongCount > 0 && (
          <button
            type="button"
            onClick={onRetryWrong}
            className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
          >
            Kertaa väärät
          </button>
        )}
        <a
          href="#/"
          className="touch-target block w-full rounded-xl bg-card py-3 text-center font-semibold text-ink ring-1 ring-line active:bg-bg"
        >
          Takaisin
        </a>
      </div>
    </Layout>
  )
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Build one question object from a tagged candidate ({ type, item, id }).
async function buildQuestion(candidate) {
  const { type, item, id } = candidate

  if (type === 'fill') {
    const wrong = distractorsFrom(fillBlanks, item, (b) => b.answer)
    return {
      id,
      source: candidate,
      promptLabel: 'Täydennä lause',
      prompt: item.template,
      correct: item.answer,
      options: shuffle([item.answer, ...wrong]),
    }
  }

  // 'mc': ask the Finnish word, answer with the Swedish word.
  const ai = await generateDistractors(item.sv, item.category)
  const wrong =
    Array.isArray(ai) && ai.length >= OPTION_COUNT - 1
      ? shuffle(ai).slice(0, OPTION_COUNT - 1)
      : distractorsFrom(vocabulary, item, (w) => w.sv)

  return {
    id,
    source: candidate,
    promptLabel: 'Mikä on ruotsiksi',
    prompt: item.fi,
    correct: item.sv,
    options: shuffle([item.sv, ...wrong]),
  }
}

// Pick OPTION_COUNT-1 distractor strings: same category+part first, then widen
// to the same category, then everything. `sourcePool` is the FULL data set.
function distractorsFrom(sourcePool, target, getText) {
  const need = OPTION_COUNT - 1
  const correctText = getText(target)

  const sameCatPart = sourcePool.filter(
    (x) => x.id !== target.id && x.category === target.category && x.part === target.part,
  )
  const sameCat = sourcePool.filter((x) => x.id !== target.id && x.category === target.category)
  const everything = sourcePool.filter((x) => x.id !== target.id)

  const ordered = [...shuffle(sameCatPart), ...shuffle(sameCat), ...shuffle(everything)]
  const seen = new Set()
  const out = []
  for (const x of ordered) {
    const text = getText(x)
    if (text === correctText || seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length === need) break
  }
  return out
}

// Weighted sampling WITHOUT replacement: pick up to n items, where a higher
// weight makes an item more likely to be picked. Used to build a session that
// leans toward the words that need review most.
function weightedSample(items, n, getWeight) {
  const pool = [...items]
  const picked = []
  const count = Math.min(n, pool.length)
  for (let k = 0; k < count; k++) {
    const total = pool.reduce((s, it) => s + Math.max(0.001, getWeight(it)), 0)
    let r = Math.random() * total
    let idx = 0
    for (let i = 0; i < pool.length; i++) {
      r -= Math.max(0.001, getWeight(pool[i]))
      if (r <= 0) {
        idx = i
        break
      }
    }
    picked.push(pool[idx])
    pool.splice(idx, 1) // remove so it can't be picked twice
  }
  return picked
}

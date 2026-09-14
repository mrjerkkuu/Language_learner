import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { ROUTES } from '../lib/routes'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import { generateDistractors } from '../services/aiService'
import { shuffle } from '../utils/shuffle'
import { distractorsFrom, weightedSample } from '../lib/quizLogic'
import Layout from './Layout'
import FilterTag from './FilterTag'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Quiz module
// -----------------------------------------------------------------------------
// A whole SESSION of questions is asked; right/wrong is shown ONLY at the end on
// a dedicated result screen (never per answer).
//
// Question types (mixed):
//   - 'mc'   : "Mikä on <kielellä>? <fi word>" -> pick the target-language word
//   - 'fill' : fill the blank in a sentence
//
// Items are weighted by spaced repetition (harder words appear more), and
// answers feed back into it. Distractors: same category+part first, then widen,
// sourced from the full pool. The generateDistractors() AI hook is tried first.
// -----------------------------------------------------------------------------

const SESSION_SIZE = 10
const OPTION_COUNT = 4

export default function Quiz() {
  const { filterItems } = useFilter()
  const { content, language } = useLanguage()
  const { getState, recordQuiz } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  // Context passed to the (pure) question builder.
  const ctx = useMemo(
    () => ({
      vocabulary: content.vocabulary,
      fillBlanks: content.fillBlanks,
      mcLabel: `Mikä on ${language.inLang}`,
    }),
    [content, language],
  )

  const candidates = useMemo(() => {
    const mc = filterItems(content.vocabulary).map((item) => ({ type: 'mc', item, id: item.id }))
    const fill = filterItems(content.fillBlanks).map((item) => ({ type: 'fill', item, id: item.id }))
    return [...mc, ...fill]
  }, [filterItems, content])

  const [session, setSession] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('quiz')
  const [building, setBuilding] = useState(true)

  const startSession = useCallback(
    async (fromCandidates) => {
      setBuilding(true)
      const chosen = weightedSample(fromCandidates, SESSION_SIZE, (c) => getState(c.id).weight)
      const built = []
      for (const c of chosen) built.push(await buildQuestion(c, ctx))
      setSession(built)
      setAnswers(new Array(built.length).fill(null))
      setIndex(0)
      setPhase('quiz')
      setBuilding(false)
    },
    [getState, ctx],
  )

  useEffect(() => {
    if (candidates.length === 0) {
      setSession([])
      setBuilding(false)
      return
    }
    startSession(candidates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates])

  function selectOption(option) {
    setAnswers((prev) => {
      const next = [...prev]
      next[index] = option
      return next
    })
  }

  function next() {
    if (index < session.length - 1) {
      setIndex((i) => i + 1)
      return
    }
    session.forEach((q, i) => recordQuiz(q.id, answers[i] === q.correct))
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

  if (phase === 'result') {
    const wrong = session.filter((q, i) => answers[i] !== q.correct)
    return (
      <ResultScreen
        total={session.length}
        correctCount={session.length - wrong.length}
        wrong={wrong}
        onRetryWrong={() => startSession(wrong.map((q) => q.source))}
      />
    )
  }

  const q = session[index]
  const selected = answers[index]
  const isLast = index === session.length - 1

  return (
    <Layout back title="Quiz" right={`${index + 1}/${session.length}`} progress={index / session.length}>
      <div className="space-y-4">
        <FilterTag />

        <div>
          {q.promptLabel && <p className="text-sm text-muted">{q.promptLabel}</p>}
          <p className="mt-1 font-display text-2xl font-bold text-ink">{q.prompt}</p>
        </div>

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

function ResultScreen({ total, correctCount, wrong, onRetryWrong }) {
  const wrongCount = total - correctCount
  return (
    <Layout back title="Quiz — tulos">
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

        {wrongCount > 0 && (
          <button
            type="button"
            onClick={onRetryWrong}
            className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
          >
            Kertaa väärät
          </button>
        )}
        {/* react-router Link (not a raw href): stays correct when routing
            switches from HashRouter to BrowserRouter in Vaihe 3. */}
        <Link
          to={ROUTES.home}
          className="touch-target block w-full rounded-xl bg-card py-3 text-center font-semibold text-ink ring-1 ring-line active:bg-bg"
        >
          Takaisin
        </Link>
      </div>
    </Layout>
  )
}

// --- Pure helpers -----------------------------------------------------------

// Build one question object from a tagged candidate ({ type, item, id }).
async function buildQuestion(candidate, ctx) {
  const { type, item, id } = candidate

  if (type === 'fill') {
    const wrong = distractorsFrom(ctx.fillBlanks, item, (b) => b.answer, OPTION_COUNT)
    return {
      id,
      source: candidate,
      promptLabel: 'Täydennä lause',
      prompt: item.template,
      correct: item.answer,
      options: shuffle([item.answer, ...wrong]),
    }
  }

  // 'mc': ask the Finnish word, answer with the target-language word.
  const ai = await generateDistractors(item.term, item.category)
  const wrong =
    Array.isArray(ai) && ai.length >= OPTION_COUNT - 1
      ? shuffle(ai).slice(0, OPTION_COUNT - 1)
      : distractorsFrom(ctx.vocabulary, item, (w) => w.term, OPTION_COUNT)

  return {
    id,
    source: candidate,
    promptLabel: ctx.mcLabel,
    prompt: item.fi,
    correct: item.term,
    options: shuffle([item.term, ...wrong]),
  }
}

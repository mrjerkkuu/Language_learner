import { useState, useEffect, useMemo } from 'react'
import vocabulary from '../data/vocabulary.json'
import fillBlanks from '../data/fillBlanks.json'
import { useFilter } from '../context/FilterContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import { generateDistractors } from '../services/aiService'
import { shuffle } from '../utils/shuffle'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Quiz module
// -----------------------------------------------------------------------------
// Two question types:
//   - 'choice' (MVP): given a Swedish word, pick the correct Finnish meaning.
//                     Generated automatically from vocabulary.json.
//   - 'fill'  (extension): fill the blank in a sentence from fillBlanks.json.
//
// The word to ask is chosen by the spaced-repetition engine, and the answer
// feeds back into it (correct lowers weight, wrong raises it).
//
// Distractor (wrong option) logic — the quality problem from the old demo:
//   1. Prefer wrong options from the SAME category AND part as the answer.
//   2. If there aren't enough, widen to the same category, then the whole pool.
//   3. Always reshuffle so the order/options aren't fixed.
// The generateDistractors() AI hook is tried first; it returns null in the MVP,
// so we fall back to the category-based logic below.
// -----------------------------------------------------------------------------

const OPTION_COUNT = 4 // 1 correct + 3 distractors

export default function Quiz() {
  const { filterItems } = useFilter()
  const { pickNext, recordQuiz } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  const [mode, setMode] = useState('choice') // 'choice' | 'fill'

  // Pools for each mode, filtered by the global filter.
  const choicePool = useMemo(() => filterItems(vocabulary), [filterItems])
  const fillPool = useMemo(() => filterItems(fillBlanks), [filterItems])
  const pool = mode === 'choice' ? choicePool : fillPool

  const [current, setCurrent] = useState(null)
  const [question, setQuestion] = useState(null) // { prompt, correct, options }
  const [selected, setSelected] = useState(null) // the option the user tapped
  const [score, setScore] = useState({ answered: 0, correct: 0 })

  // Choose the word/sentence to ask (re-pick when the pool or mode changes).
  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null)
      return
    }
    setCurrent((prev) => (prev && pool.some((i) => i.id === prev.id) ? prev : pickNext(pool)))
    setSelected(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, mode])

  // Build the question (options) whenever the current item changes. This is
  // async because the AI hook is async; `cancelled` guards against a stale
  // build finishing after we've already moved on.
  useEffect(() => {
    let cancelled = false
    async function build() {
      if (!current) {
        setQuestion(null)
        return
      }
      const q = mode === 'choice' ? await buildChoiceQuestion(current) : await buildFillQuestion(current)
      if (!cancelled) setQuestion(q)
    }
    build()
    return () => {
      cancelled = true
    }
  }, [current, mode])

  // Handle an answer tap.
  function handleSelect(option) {
    if (selected || !question) return // ignore taps after the first answer
    setSelected(option)
    const isCorrect = option === question.correct
    recordQuiz(current.id, isCorrect)
    logActivity(1)
    setScore((s) => ({ answered: s.answered + 1, correct: s.correct + (isCorrect ? 1 : 0) }))
  }

  function nextQuestion() {
    setCurrent(pickNext(pool, current?.id))
    setSelected(null)
  }

  if (pool.length === 0) {
    return (
      <div className="space-y-3">
        <ModeToggle mode={mode} setMode={setMode} />
        <EmptyState
          title="Ei kysymyksiä tällä suodattimella"
          hint="Valitse toinen osa/aihepiiri tai vaihda kysymystyyppiä."
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ModeToggle mode={mode} setMode={setMode} />

      {/* Session score */}
      <div className="text-right text-sm text-slate-500">
        Oikein {score.correct} / {score.answered}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        {!question ? (
          <p className="text-slate-400">Ladataan…</p>
        ) : (
          <>
            {/* Prompt: a word (choice) or a sentence with a blank (fill). */}
            <p className="mb-4 text-center text-xl font-semibold text-slate-900">
              {question.prompt}
            </p>

            {/* Options */}
            <div className="grid gap-2">
              {question.options.map((opt) => (
                <OptionButton
                  key={opt}
                  option={opt}
                  selected={selected}
                  correct={question.correct}
                  onClick={() => handleSelect(opt)}
                />
              ))}
            </div>

            {/* Feedback + next (only after answering) */}
            {selected && (
              <div className="mt-4">
                <p
                  className={
                    'mb-3 text-center font-semibold ' +
                    (selected === question.correct ? 'text-green-700' : 'text-rose-700')
                  }
                >
                  {selected === question.correct
                    ? 'Oikein!'
                    : `Väärin — oikea vastaus: ${question.correct}`}
                </p>
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="touch-target w-full rounded-xl bg-brand-600 py-3 font-semibold text-white active:brightness-95"
                >
                  Seuraava kysymys
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Question builders
// -----------------------------------------------------------------------------

// Multiple choice: Swedish word -> Finnish meaning.
async function buildChoiceQuestion(word) {
  // Try the AI hook first (null in the MVP), then fall back to category logic.
  const ai = await generateDistractors(word.sv, word.category)
  const wrong =
    Array.isArray(ai) && ai.length >= OPTION_COUNT - 1
      ? shuffle(ai).slice(0, OPTION_COUNT - 1)
      : distractorsFrom(vocabulary, word, (w) => w.fi)

  return {
    prompt: word.sv,
    correct: word.fi,
    options: shuffle([word.fi, ...wrong]),
  }
}

// Fill in the blank: sentence with ___ -> the missing word.
async function buildFillQuestion(blank) {
  const wrong = distractorsFrom(fillBlanks, blank, (b) => b.answer)
  return {
    prompt: blank.template,
    correct: blank.answer,
    options: shuffle([blank.answer, ...wrong]),
  }
}

// Shared distractor picker implementing the "same category+part first, then
// widen" rule. `sourcePool` is the FULL data set (not the filtered one) so we
// can always find enough options even when the active filter is narrow.
// `getText` maps an item to the string shown as an option.
function distractorsFrom(sourcePool, target, getText) {
  const need = OPTION_COUNT - 1
  const correctText = getText(target)

  // Priority tiers, most-relevant first.
  const sameCatPart = sourcePool.filter(
    (x) => x.id !== target.id && x.category === target.category && x.part === target.part,
  )
  const sameCat = sourcePool.filter((x) => x.id !== target.id && x.category === target.category)
  const everything = sourcePool.filter((x) => x.id !== target.id)

  // Concatenate tiers, then take unique option texts (excluding the correct one)
  // in priority order until we have enough. Shuffle each tier so repeats vary.
  const ordered = [...shuffle(sameCatPart), ...shuffle(sameCat), ...shuffle(everything)]

  const seen = new Set()
  const out = []
  for (const item of ordered) {
    const text = getText(item)
    if (text === correctText || seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length === need) break
  }
  return out
}

// -----------------------------------------------------------------------------
// Small presentational pieces
// -----------------------------------------------------------------------------

// Question-type switch.
function ModeToggle({ mode, setMode }) {
  return (
    <div className="flex gap-2">
      <ModeButton active={mode === 'choice'} onClick={() => setMode('choice')}>
        Monivalinta
      </ModeButton>
      <ModeButton active={mode === 'fill'} onClick={() => setMode('fill')}>
        Täydennä lause
      </ModeButton>
    </div>
  )
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'touch-target flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ' +
        (active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 active:bg-slate-200')
      }
    >
      {children}
    </button>
  )
}

// A single answer option. After answering, the correct option turns green and a
// wrong pick turns red; before that, options are neutral and tappable.
function OptionButton({ option, selected, correct, onClick }) {
  const answered = selected !== null
  const isCorrect = option === correct
  const isChosen = option === selected

  let style = 'bg-slate-50 text-slate-800 active:bg-slate-100'
  if (answered && isCorrect) style = 'bg-green-100 text-green-800 ring-1 ring-green-300'
  else if (answered && isChosen) style = 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
  else if (answered) style = 'bg-slate-50 text-slate-400'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={answered}
      className={`touch-target rounded-xl px-4 py-3 text-left text-base font-medium ${style}`}
    >
      {option}
    </button>
  )
}

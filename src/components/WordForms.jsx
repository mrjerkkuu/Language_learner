import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import Layout from './Layout'
import FilterTag from './FilterTag'
import { Pill } from './FilterBar'
import EmptyState from './EmptyState'
import { ROUTES } from '../lib/routes'
import { pickNext } from '../lib/srLogic'
import { buildSteps, itemsOfKind, wordKind, wordStateMap } from '../lib/wordFormsLogic'

// -----------------------------------------------------------------------------
// Muodot (Word forms) module
// -----------------------------------------------------------------------------
// Practises a word's INFLECTION CHAIN, one step at a time (data generated from
// SALDO, see src/data/sv/wordForms.json and scripts/fetch-saldo-forms.mjs):
//   - verb: presens -> preteritum -> supinum
//   - noun: en/ett -> definite singular (-> plural -> definite plural)
// Each step is multiple choice among the word's OWN forms, with immediate
// feedback, and is recorded as its own spaced-repetition card
// (`<item id>:<step>`). Words are picked by srLogic.pickNext over a per-word
// state aggregated from those cards, so a weak form brings its word back.
// See src/lib/wordFormsLogic.js.
// -----------------------------------------------------------------------------

// Instruction + a short Swedish cue per step. `{article}` is filled per noun.
const STEP_LABEL = {
  presens: { title: 'Preesens', cue: 'jag ___ (nyt)' },
  preteritum: { title: 'Imperfekti', cue: 'jag ___ (eilen)' },
  supinum: { title: 'Perfekti', cue: 'jag har ___' },
  gender: { title: 'en vai ett?', cue: null },
  sgDef: { title: 'Määräinen muoto', cue: '{article} ___' },
  plIndef: { title: 'Monikko', cue: 'många ___' },
  plDef: { title: 'Määräinen monikko', cue: 'de ___' },
}

function stepCue(step, item) {
  const cue = STEP_LABEL[step.key].cue
  return cue && cue.replace('{article}', item.gender === 'ett' ? 'det' : 'den')
}

// The word as shown on the card: verbs with "att", nouns bare (the article is
// what the gender step asks).
const promptFor = (item) =>
  wordKind(item) === 'verb' ? `att ${item.forms.infinitiv}` : item.forms.sgIndef

const KINDS = [
  { id: 'all', label: 'Kaikki sanat' },
  { id: 'verbs', label: 'Verbit' },
  { id: 'nouns', label: 'Substantiivit' },
]

// Kaikki sanat / Verbit / Substantiivit — the same pill style as the area filter.
function KindToggle({ kind, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Sanaluokka">
      {KINDS.map((k) => (
        <Pill key={k.id} active={kind === k.id} onClick={() => onChange(k.id)}>
          {k.label}
        </Pill>
      ))}
    </div>
  )
}

// CC BY 4.0 attribution for the SALDO data, read from the data's own `source`
// (same small muted style as the "Tietoa ja tietosuoja" link on Landing).
function SourceCredit({ source }) {
  if (!source?.url) return null
  return (
    <div className="pt-2 text-center">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-muted underline-offset-2 active:opacity-70"
      >
        Taivutusmuodot: {source.name} ({source.license})
      </a>
    </div>
  )
}

// Shared frame for every Muodot view: filter tag and kind toggle on top,
// source credit at the bottom.
function Page({ right = null, progress = null, kind, onKind, source, children }) {
  return (
    <Layout back title="Muodot" right={right} progress={progress}>
      <div className="space-y-4">
        <FilterTag />
        <KindToggle kind={kind} onChange={onKind} />
        {children}
        <SourceCredit source={source} />
      </div>
    </Layout>
  )
}

// Route guard: a language without word-form data has no Muodot module, so a
// direct visit to its URL goes back to the home page instead of crashing.
// English Muodot hidden until structured inflection data exists for English.
// SALDO (used for Swedish, see scripts/fetch-saldo-forms.mjs) covers Swedish only;
// English needs another open machine-readable source, same method. See K3 in
// claude/tulevat-muutokset.md.
export default function WordForms() {
  const { content } = useLanguage()
  if (!content.wordForms) return <Navigate to={ROUTES.app} replace />
  return <WordFormsPractice />
}

function WordFormsPractice() {
  const { filterItems } = useFilter()
  const { content } = useLanguage()
  const { getState, recordResult } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  const [kind, setKind] = useState('all')
  const pool = useMemo(
    () => filterItems(itemsOfKind(content.wordForms, kind)),
    [filterItems, content, kind],
  )

  // task = { item, steps } — steps (with shuffled options) are built once per
  // word so options don't reshuffle on re-render.
  const [task, setTask] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [reviewed, setReviewed] = useState(0)

  function pickWord(excludeId = null) {
    return pickNext(wordStateMap(getState, pool), pool, { excludeId })
  }

  function startTask(item) {
    setTask(item ? { item, steps: buildSteps(item) } : null)
    setStepIndex(0)
    setAnswers([])
  }

  useEffect(() => {
    if (pool.length === 0) {
      startTask(null)
      return
    }
    if (!task || !pool.some((i) => i.id === task.item.id)) startTask(pickWord())
    setReviewed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  // Answer the current step: immediate feedback + its own SR card.
  function choose(option) {
    const current = task?.steps[stepIndex]
    if (!current || answers[stepIndex] !== undefined) return // one answer per step
    setAnswers((prev) => [...prev, option])
    recordResult(current.cardId, option === current.answer)
  }

  // Next step; after the last one the index moves past the end (summary view)
  // and the word counts as one practised item.
  function continueStep() {
    const next = stepIndex + 1
    setStepIndex(next)
    if (next === task.steps.length) {
      logActivity(1)
      setReviewed((n) => n + 1)
    }
  }

  const done = Math.min(reviewed, pool.length)
  const rightText = pool.length ? `${done}/${pool.length}` : null
  const progress = pool.length ? done / pool.length : null
  const frame = { kind, onKind: setKind, source: content.wordForms.source }

  if (pool.length === 0) {
    return (
      <Page {...frame}>
        <EmptyState title="Ei harjoituksia" />
      </Page>
    )
  }
  if (!task) return null

  const { item, steps } = task
  const step = steps[stepIndex]

  function nextWord() {
    startTask(pickWord(item.id))
  }

  // Summary after the last step: the whole chain with what was right/wrong.
  if (!step) {
    const correctCount = steps.filter((s, i) => answers[i] === s.answer).length
    return (
      <Page right={rightText} progress={progress} {...frame}>
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="text-center">
            <div className="font-display text-3xl font-bold text-ink">{promptFor(item)}</div>
            <div className="mt-1 text-sm text-muted">{item.fi}</div>
            <div className="mt-3 text-sm font-semibold text-ink">
              {correctCount}/{steps.length} oikein
            </div>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {steps.map((s, i) => {
              const ok = answers[i] === s.answer
              return (
                <li key={s.key} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-muted">{STEP_LABEL[s.key].title}</span>
                  <span className="text-right">
                    <span className={`font-semibold ${ok ? 'text-learned' : 'text-wrong'}`}>
                      {ok ? '✓' : '✗'} {s.answer}
                    </span>
                    {!ok && (
                      <span className="block text-xs text-muted">valitsit: {answers[i]}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <button
          type="button"
          onClick={nextWord}
          className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
        >
          Seuraava sana
        </button>
      </Page>
    )
  }

  const selected = answers[stepIndex]
  const answered = selected !== undefined

  return (
    <Page right={rightText} progress={progress} {...frame}>
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {STEP_LABEL[step.key].title} · {stepIndex + 1}/{steps.length}
        </div>
        <div className="font-display text-3xl font-bold text-ink">{promptFor(item)}</div>
        <div className="mt-1 text-sm text-muted">{item.fi}</div>
        {stepCue(step, item) && (
          <div className="mt-3 text-base italic text-ink">{stepCue(step, item)}</div>
        )}
      </div>

      {/* Options: the word's own forms, with immediate correct/wrong feedback. */}
      <div className="grid gap-2">
        {step.options.map((opt) => {
          const isCorrect = opt === step.answer
          const isChosen = opt === selected
          let style = 'border-line bg-card text-ink active:bg-bg'
          if (answered && isCorrect) style = 'border-learned bg-learned-soft text-learned'
          else if (answered && isChosen) style = 'border-wrong bg-card text-wrong'
          else if (answered) style = 'border-line bg-card text-muted'
          return (
            <button
              key={opt}
              type="button"
              onClick={() => choose(opt)}
              disabled={answered}
              className={`touch-target rounded-xl border px-4 py-3 text-center text-lg font-semibold transition-colors ${style}`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* Feedback + continue */}
      {answered && (
        <div>
          <p
            className={
              'mb-3 text-center font-semibold ' +
              (selected === step.answer ? 'text-learned' : 'text-wrong')
            }
          >
            {selected === step.answer ? 'Oikein!' : `Oikea vastaus: ${step.answer}`}
          </p>
          <button
            type="button"
            onClick={continueStep}
            className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
          >
            Jatka
          </button>
        </div>
      )}
    </Page>
  )
}

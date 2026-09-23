import { useState, useEffect, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import { useSessionSize } from '../hooks/useSessionSize'
import Layout from './Layout'
import FilterTag from './FilterTag'
import { Pill } from './FilterBar'
import EmptyState from './EmptyState'
import SessionSizePicker from './SessionSizePicker'
import { ROUTES } from '../lib/routes'
import { STORAGE_KEYS } from '../lib/storageKeys'
import { buildSession } from '../lib/sessionLogic'
import {
  buildSteps,
  itemsOfKind,
  sessionSummary,
  wordKind,
  wordResult,
  wordStateMap,
} from '../lib/wordFormsLogic'

// -----------------------------------------------------------------------------
// Muodot (Word forms) module
// -----------------------------------------------------------------------------
// Practises a word's INFLECTION CHAIN, one step at a time (data generated from
// SALDO, see src/data/sv/wordForms.json and scripts/fetch-saldo-forms.mjs):
//   - verb: presens -> preteritum -> supinum
//   - noun: en/ett -> definite singular (-> plural -> definite plural)
// Each step is multiple choice among the word's OWN forms, with immediate
// feedback, and is recorded as its own spaced-repetition card
// (`<item id>:<step>`).
//
// Practice runs in SESSIONS: the user first picks how many WORDS (5/10/15/20,
// last choice remembered per module; default 10) and the word set (Kaikki
// sanat / Verbit / Substantiivit). "Aloita" builds the session with
// sessionLogic.buildSession over a per-word state aggregated from the step
// cards, so the hardest form decides how likely a word is. After the last
// word a session result screen sums up the words. See src/lib/wordFormsLogic.js.
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

// Shared frame for every Muodot view: filter tag on top (plus the kind toggle
// before a session starts), source credit at the bottom.
function Page({
  title = 'Muodot',
  right = null,
  progress = null,
  showKind = false,
  kind,
  onKind,
  source,
  children,
}) {
  return (
    <Layout back title={title} right={right} progress={progress}>
      <div className="space-y-4">
        <FilterTag />
        {showKind && <KindToggle kind={kind} onChange={onKind} />}
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

  const [sessionSize, setSessionSize] = useSessionSize(STORAGE_KEYS.formsSessionSize, 10)
  const [phase, setPhase] = useState('select') // 'select' | 'practice' | 'result'
  const [session, setSession] = useState([]) // the session's words, in order
  const [wordIndex, setWordIndex] = useState(0)
  const [results, setResults] = useState([]) // [{ item, correct, total }] per finished word

  // task = { item, steps } — steps (with shuffled options) are built once per
  // word so options don't reshuffle on re-render.
  const [task, setTask] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState([])

  function startTask(item) {
    setTask(item ? { item, steps: buildSteps(item) } : null)
    setStepIndex(0)
    setAnswers([])
  }

  // A changed filter or word set (or a finished session) goes back to the size
  // picker; a session is only ever built by "Aloita".
  function backToSelect() {
    setPhase('select')
    setSession([])
    setWordIndex(0)
    setResults([])
    startTask(null)
  }

  useEffect(() => {
    backToSelect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  function startSession(size) {
    setSessionSize(size)
    const words = buildSession(wordStateMap(getState, pool), pool, { size })
    setSession(words)
    setWordIndex(0)
    setResults([])
    startTask(words[0])
    setPhase('practice')
  }

  // Answer the current step: immediate feedback + its own SR card.
  function choose(option) {
    const current = task?.steps[stepIndex]
    if (!current || answers[stepIndex] !== undefined) return // one answer per step
    setAnswers((prev) => [...prev, option])
    recordResult(current.cardId, option === current.answer)
  }

  // Next step; after the last one the index moves past the end (word summary)
  // and the word counts as one practised item.
  function continueStep() {
    const next = stepIndex + 1
    setStepIndex(next)
    if (next === task.steps.length) {
      logActivity(1)
      setResults((prev) => [...prev, { item: task.item, ...wordResult(task.steps, answers) }])
    }
  }

  // Next word of the session, or the session result after the last one.
  function nextWord() {
    if (wordIndex < session.length - 1) {
      setWordIndex(wordIndex + 1)
      startTask(session[wordIndex + 1])
    } else {
      setPhase('result')
    }
  }

  const frame = { kind, onKind: setKind, source: content.wordForms.source }

  if (pool.length === 0) {
    return (
      <Page showKind {...frame}>
        <EmptyState title="Ei harjoituksia" />
      </Page>
    )
  }

  if (phase === 'select') {
    return (
      <Page showKind {...frame}>
        <SessionSizePicker
          title="Montako sanaa?"
          unit="sanaa"
          initialSize={sessionSize}
          available={pool.length}
          onStart={startSession}
        />
      </Page>
    )
  }

  if (phase === 'result') {
    return (
      <Page title="Muodot — tulos" source={content.wordForms.source}>
        <SessionResult results={results} onNewSession={backToSelect} />
      </Page>
    )
  }

  if (!task) return null

  const { item, steps } = task
  const step = steps[stepIndex]
  const rightText = `${wordIndex + 1}/${session.length}`
  const progress = results.length / session.length
  const isLastWord = wordIndex === session.length - 1

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
          {isLastWord ? 'Näytä tulos' : 'Seuraava sana'}
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

// Session result: how many WORDS went fully right, partly right or all wrong,
// the answer total, and every word with its steps-right count. Same look as the
// Sanakortit result screen.
function SessionResult({ results, onNewSession }) {
  const summary = sessionSummary(results)
  const tone = ({ correct, total }) =>
    correct === total ? 'text-learned' : correct === 0 ? 'text-wrong' : 'text-ink'

  return (
    <>
      <div className="bg-motivation rounded-2xl p-6 text-center text-white">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
          Sanat kokonaan oikein
        </div>
        <div className="font-display text-5xl font-bold">
          {summary.perfect}
          <span className="text-2xl font-medium text-white/80">/{summary.words}</span>
        </div>
        <div className="mt-2 text-sm text-white/90">
          Vastauksista oikein {summary.correctSteps}/{summary.totalSteps}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-line">
          <div className="font-display text-2xl font-bold text-learned">{summary.perfect}</div>
          <div className="text-xs text-muted">kokonaan oikein</div>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-line">
          <div className="font-display text-2xl font-bold text-ink">{summary.partial}</div>
          <div className="text-xs text-muted">osittain</div>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-line">
          <div className="font-display text-2xl font-bold text-wrong">{summary.missed}</div>
          <div className="text-xs text-muted">kokonaan väärin</div>
        </div>
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-line">
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.item.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-semibold text-ink">{promptFor(r.item)}</span>
                <span className="text-muted"> — {r.item.fi}</span>
              </span>
              <span className={`shrink-0 font-semibold ${tone(r)}`}>
                {r.correct}/{r.total}
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
    </>
  )
}

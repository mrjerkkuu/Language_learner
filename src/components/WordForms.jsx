import { useState, useEffect, useMemo } from 'react'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'
import { useActivityLog } from '../hooks/useActivityLog'
import Layout from './Layout'
import FilterTag from './FilterTag'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Muodot (Word forms) module
// -----------------------------------------------------------------------------
// Practises word FORMS, not translation. Each item is a small multiple-choice
// question driven by data (src/data/<lang>/wordForms.json):
//   - Swedish: "en vai ett?" (article) and definite forms
//   - English: plurals and past-tense forms
// Unlike the Quiz, feedback here is immediate (form drilling). Results feed
// spaced repetition so the trickier forms come back more often.
// -----------------------------------------------------------------------------

// Instruction shown per question type. Falls back for unknown types.
const TYPE_LABEL = {
  article: 'en vai ett?',
  definite: 'Valitse määräinen muoto',
  plural: 'Valitse monikko',
  past: 'Valitse imperfekti',
}

export default function WordForms() {
  const { filterItems } = useFilter()
  const { content } = useLanguage()
  const { pickNext, recordResult } = useSpacedRepetition()
  const { logActivity } = useActivityLog()

  const pool = useMemo(() => filterItems(content.wordForms), [filterItems, content])

  const [current, setCurrent] = useState(null)
  const [selected, setSelected] = useState(null)
  const [reviewed, setReviewed] = useState(0)

  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null)
      return
    }
    setCurrent((prev) => (prev && pool.some((c) => c.id === prev.id) ? prev : pickNext(pool)))
    setSelected(null)
    setReviewed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  function choose(option) {
    if (selected || !current) return // ignore taps after the first answer
    setSelected(option)
    recordResult(current.id, option === current.answer)
    logActivity(1)
    setReviewed((n) => n + 1)
  }

  function nextItem() {
    setCurrent(pickNext(pool, current?.id))
    setSelected(null)
  }

  const done = Math.min(reviewed, pool.length)
  const rightText = pool.length ? `${done}/${pool.length}` : null
  const progress = pool.length ? done / pool.length : null

  if (pool.length === 0) {
    return (
      <Layout back title="Muodot">
        <div className="space-y-4">
          <FilterTag />
          <EmptyState title="Ei harjoituksia" />
        </div>
      </Layout>
    )
  }
  if (!current) return null

  const instruction = TYPE_LABEL[current.type] ?? 'Valitse oikea muoto'

  return (
    <Layout back title="Muodot" right={rightText} progress={progress}>
      <div className="space-y-4">
        <FilterTag />

        <div className="rounded-2xl border border-line bg-card p-6 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            {instruction}
          </div>
          <div className="font-display text-3xl font-bold text-ink">{current.prompt}</div>
          {current.fi && <div className="mt-1 text-sm text-muted">{current.fi}</div>}
        </div>

        {/* Options with immediate correct/wrong feedback. */}
        <div className="grid gap-2">
          {current.options.map((opt) => {
            const answered = selected !== null
            const isCorrect = opt === current.answer
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

        {/* Feedback + next */}
        {selected && (
          <div>
            <p
              className={
                'mb-3 text-center font-semibold ' +
                (selected === current.answer ? 'text-learned' : 'text-wrong')
              }
            >
              {selected === current.answer ? 'Oikein!' : `Oikea vastaus: ${current.answer}`}
            </p>
            <button
              type="button"
              onClick={nextItem}
              className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
            >
              Seuraava
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

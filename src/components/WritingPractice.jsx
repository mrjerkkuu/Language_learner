import { useMemo, useState, useEffect } from 'react'
import { useFilter } from '../context/FilterContext'
import { useLanguage } from '../context/LanguageContext'
import { useActivityLog } from '../hooks/useActivityLog'
import { checkWriting } from '../services/aiService'
import Layout from './Layout'
import FilterTag from './FilterTag'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// Kirjoitus (Writing practice) module
// -----------------------------------------------------------------------------
// Read the task -> write your own answer -> reveal a model answer to compare.
// There is NO automatic grading (you compare yourself). The checkWriting() AI
// hook is tried on reveal; it returns null in the MVP, so we just show the model
// answer. When AI is added later, feedback appears here with no other change.
// -----------------------------------------------------------------------------

export default function WritingPractice() {
  const { filterItems } = useFilter()
  const { content, partLabel, language } = useLanguage()
  const { logActivity } = useActivityLog()

  const list = useMemo(() => filterItems(content.writingTasks), [filterItems, content])

  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [showHints, setShowHints] = useState(false)

  useEffect(() => {
    setIndex(0)
    reset()
  }, [list])

  function reset() {
    setAnswer('')
    setRevealed(false)
    setAiResult(null)
    setShowHints(false)
  }

  const current = list[index]

  async function handleReveal() {
    if (!current) return
    setChecking(true)
    try {
      setAiResult(await checkWriting(answer, current.task))
    } catch {
      setAiResult(null)
    }
    setRevealed(true)
    setChecking(false)
    logActivity(1)
  }

  function nextTask() {
    setIndex((i) => (i + 1) % list.length)
    reset()
  }

  if (list.length === 0) {
    return (
      <Layout back title="Kirjoitus">
        <div className="space-y-4">
          <FilterTag />
          <EmptyState title="Ei tehtäviä" />
        </div>
      </Layout>
    )
  }
  if (!current) return null

  return (
    <Layout back title="Kirjoitus" right={`${index + 1}/${list.length}`}>
      <div className="space-y-4">
        {/* Task card (soft accent background): Swedish instruction + Finnish. */}
        <div className="rounded-2xl bg-accent-soft p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
            Tehtävä · {partLabel(current.part)}
          </div>
          <p className="font-semibold text-ink">{current.task}</p>
          <p className="mt-1 text-sm text-muted">{current.task_fi}</p>

          {current.hints?.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowHints((s) => !s)}
                className="text-sm font-medium text-accent underline underline-offset-2"
              >
                {showHints ? 'Piilota vinkit' : 'Näytä vinkit'}
              </button>
              {showHints && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {current.hints.map((h) => (
                    <span key={h} className="rounded-full bg-card px-3 py-1 text-sm text-ink ring-1 ring-line">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Own answer */}
        <div>
          <div className="mb-1 text-sm font-semibold text-ink">Oma vastaus</div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder={`Kirjoita vastauksesi ${language.inLang}…`}
            className="w-full resize-y rounded-xl border border-line bg-card p-3 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* AI feedback (only when the hook returns something — off in the MVP) */}
        {revealed && aiResult && (
          <div className="rounded-xl bg-accent-soft p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
              Tekoälyn palaute
            </div>
            {aiResult.corrected && <p className="text-ink">{aiResult.corrected}</p>}
            {aiResult.feedback && <p className="mt-1 text-sm text-muted">{aiResult.feedback}</p>}
          </div>
        )}

        {/* Model answer (green), shown after reveal */}
        {revealed && (
          <div className="rounded-xl bg-learned-soft p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-learned">
              <span className="h-1.5 w-1.5 rounded-full bg-learned" /> Mallivastaus · vertailuun
            </div>
            <p className="text-ink">{current.model_answer}</p>
          </div>
        )}

        {revealed && (
          <p className="text-center text-sm text-muted">Vertaa itse — ei automaattista arviointia</p>
        )}

        {/* Actions */}
        {!revealed ? (
          <button
            type="button"
            onClick={handleReveal}
            disabled={checking}
            className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95 disabled:opacity-60"
          >
            {checking ? 'Tarkistetaan…' : 'Näytä mallivastaus'}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextTask}
            className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
          >
            Seuraava tehtävä
          </button>
        )}
      </div>
    </Layout>
  )
}

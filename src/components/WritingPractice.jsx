import { useMemo, useState, useEffect } from 'react'
import writingTasks from '../data/writingTasks.json'
import { useFilter } from '../context/FilterContext'
import { useActivityLog } from '../hooks/useActivityLog'
import { checkWriting } from '../services/aiService'
import { categoryLabel, partLabel } from '../data/categories'
import EmptyState from './EmptyState'

// -----------------------------------------------------------------------------
// WritingPractice module
// -----------------------------------------------------------------------------
// Flow: read the task prompt -> write your own answer -> reveal a model answer
// to compare against.
//
// AI hook: on "check", we call checkWriting() from aiService. In the MVP that
// returns null (no AI), so we fall back to simply showing the model answer.
// When AI is added later, the SAME call will return feedback and this component
// will show it automatically — no other change needed here.
// -----------------------------------------------------------------------------

export default function WritingPractice() {
  const { filterItems } = useFilter()
  const { logActivity } = useActivityLog()

  const list = useMemo(() => filterItems(writingTasks), [filterItems])

  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [aiResult, setAiResult] = useState(null) // populated only if AI is on
  const [showHints, setShowHints] = useState(false)

  // Reset to the first task whenever the filtered list changes.
  useEffect(() => {
    setIndex(0)
    resetTaskState()
  }, [list])

  function resetTaskState() {
    setAnswer('')
    setRevealed(false)
    setAiResult(null)
    setShowHints(false)
  }

  const current = list[index]

  // Check the answer: ask the AI service first, fall back to the model answer.
  async function handleCheck() {
    if (!current) return
    setChecking(true)
    try {
      // Returns null in the MVP; an object { corrected, feedback } once AI is on.
      const result = await checkWriting(answer, current.prompt)
      setAiResult(result)
    } catch {
      setAiResult(null) // any AI error -> silently fall back to the model answer
    }
    setRevealed(true)
    setChecking(false)
    logActivity(1)
  }

  function nextTask() {
    setIndex((i) => (i + 1) % list.length)
    resetTaskState()
  }

  if (list.length === 0) {
    return (
      <EmptyState
        title="Ei kirjoitustehtäviä tällä suodattimella"
        hint="Valitse toinen osa tai aihepiiri ylhäältä."
      />
    )
  }
  if (!current) return null

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {/* Task counter + tags */}
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          Tehtävä {index + 1} / {list.length}
        </span>
        <span>
          {partLabel(current.part)} · {categoryLabel(current.category)}
        </span>
      </div>

      {/* The prompt (task instruction, in Finnish). */}
      <p className="mb-3 font-medium text-slate-900">{current.prompt}</p>

      {/* Optional hints */}
      {current.hints?.length > 0 && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowHints((s) => !s)}
            className="text-sm font-medium text-brand-700 underline underline-offset-2"
          >
            {showHints ? 'Piilota vinkit' : 'Näytä vinkit'}
          </button>
          {showHints && (
            <div className="mt-2 flex flex-wrap gap-2">
              {current.hints.map((h) => (
                <span key={h} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Your own answer */}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder="Kirjoita vastauksesi ruotsiksi…"
        className="w-full resize-y rounded-xl border border-slate-300 p-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          className="touch-target flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white active:brightness-95 disabled:opacity-60"
        >
          {checking ? 'Tarkistetaan…' : 'Näytä mallivastaus'}
        </button>
        <button
          type="button"
          onClick={nextTask}
          className="touch-target rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 active:bg-slate-200"
        >
          Seuraava
        </button>
      </div>

      {/* Result area (only after checking) */}
      {revealed && (
        <div className="mt-4 space-y-3">
          {/* AI feedback branch — shown only when the AI service returned something */}
          {aiResult && (
            <div className="rounded-xl bg-brand-50 p-3">
              <div className="mb-1 text-xs font-semibold uppercase text-brand-700">
                Tekoälyn palaute
              </div>
              {aiResult.corrected && (
                <p className="text-slate-800">{aiResult.corrected}</p>
              )}
              {aiResult.feedback && (
                <p className="mt-1 text-sm text-slate-600">{aiResult.feedback}</p>
              )}
            </div>
          )}

          {/* Your answer, for side-by-side comparison */}
          {answer.trim() && (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                Oma vastauksesi
              </div>
              <p className="whitespace-pre-wrap text-slate-800">{answer}</p>
            </div>
          )}

          {/* Model answer (the always-available fallback) */}
          <div className="rounded-xl bg-green-50 p-3">
            <div className="mb-1 text-xs font-semibold uppercase text-green-700">
              Mallivastaus
            </div>
            <p className="text-slate-800">{current.model_answer}</p>
          </div>
        </div>
      )}
    </div>
  )
}

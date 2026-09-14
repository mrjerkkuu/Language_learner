// Small shared component shown when the current filter leaves a module with no
// content. Kept generic so every module can reuse it with its own message.
export default function EmptyState({ title = 'Ei sisältöä', hint }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

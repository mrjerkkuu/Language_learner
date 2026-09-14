import { useId } from 'react'

// -----------------------------------------------------------------------------
// FormField
// -----------------------------------------------------------------------------
// A labelled input with an inline error message, wired for accessibility:
//   - <label htmlFor> ties the label to the input,
//   - aria-invalid + aria-describedby link the error text to the input so
//     screen readers announce it.
// Styling matches the app's 2a tokens (bg-card / border-line / text-ink …) and
// dark mode follows automatically. Extra props (type, value, onChange,
// autoComplete, inputMode, placeholder…) pass straight through to <input>.
//
// When `error` is set, the border turns red (border-wrong) so the problem is
// visible without relying on colour alone (the message text is also shown).
// -----------------------------------------------------------------------------

export default function FormField({ label, error, hint, id, children, ...inputProps }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  return (
    <div className="mt-4">
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>

      {/* `children` lets a caller supply a custom control (e.g. PasswordInput);
          otherwise we render a standard <input>. */}
      {children ?? (
        <input
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={
            'w-full rounded-xl border bg-card px-4 py-3 text-base text-ink outline-none ' +
            'transition-colors placeholder:text-muted focus:border-accent ' +
            (error ? 'border-wrong' : 'border-line')
          }
          {...inputProps}
        />
      )}

      {/* Hint (shown only when there is no error). */}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}

      {/* Inline error. role="alert" so it's announced when it appears. */}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-wrong">
          {error}
        </p>
      )}
    </div>
  )
}

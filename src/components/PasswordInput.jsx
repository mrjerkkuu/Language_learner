import { useId, useState } from 'react'

// -----------------------------------------------------------------------------
// PasswordInput
// -----------------------------------------------------------------------------
// A complete labelled password field with a show/hide toggle (the eye button).
// It's its own field (label + input + error + hint) rather than reusing
// FormField, because the toggle needs to sit inside the input box and control
// the input's `type`.
//
// Accessibility:
//   - the toggle is a real <button> with an aria-label + aria-pressed,
//   - aria-invalid + aria-describedby link any error to the input.
// Security/UX: pass the right `autoComplete` ('current-password' on login,
// 'new-password' on register) so password managers behave correctly.
// -----------------------------------------------------------------------------

export default function PasswordInput({
  label = 'Salasana',
  value,
  onChange,
  error,
  hint,
  autoComplete = 'current-password',
  id,
  ...inputProps
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const [visible, setVisible] = useState(false)

  return (
    <div className="mt-4">
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>

      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={
            'w-full rounded-xl border bg-card py-3 pl-4 pr-12 text-base text-ink outline-none ' +
            'transition-colors placeholder:text-muted focus:border-accent ' +
            (error ? 'border-wrong' : 'border-line')
          }
          {...inputProps}
        />

        {/* Show / hide toggle */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Piilota salasana' : 'Näytä salasana'}
          aria-pressed={visible}
          className="touch-target absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg text-muted active:bg-line/60"
        >
          {visible ? (
            // Eye with a slash (currently visible -> click to hide)
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M10.6 5.1A9.8 9.8 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4M6.1 6.1A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 004.1-.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            // Open eye (currently hidden -> click to show)
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </button>
      </div>

      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-wrong">
          {error}
        </p>
      )}
    </div>
  )
}

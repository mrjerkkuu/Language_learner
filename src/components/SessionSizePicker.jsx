import { useState } from 'react'
import { SESSION_SIZES } from '../lib/sessionLogic'
import { Pill } from './FilterBar'

// -----------------------------------------------------------------------------
// SessionSizePicker — "how many?" screen shown before every session
// -----------------------------------------------------------------------------
// Pills for SESSION_SIZES (5/10/15/20) with the module's last choice
// preselected. Tapping a pill only selects; nothing starts until "Aloita",
// which hands the chosen size to `onStart` (the module then remembers it and
// builds the session). `available` is the filtered pool size, so the user can
// see when a session will be smaller than the chosen size.
// -----------------------------------------------------------------------------

export default function SessionSizePicker({ title, unit, initialSize, available, onStart }) {
  const [selected, setSelected] = useState(initialSize)
  const sessionLength = Math.min(selected, available)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>

        <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Session koko">
          {SESSION_SIZES.map((size) => (
            <Pill key={size} active={selected === size} onClick={() => setSelected(size)}>
              {size}
            </Pill>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted">
          {available < selected
            ? `Valittavissa ${available} – sessiossa kaikki ${available}`
            : `Valittavissa ${available}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onStart(selected)}
        className="touch-target w-full rounded-xl bg-accent py-3 font-semibold text-white active:brightness-95"
      >
        Aloita ({sessionLength} {unit})
      </button>
    </div>
  )
}

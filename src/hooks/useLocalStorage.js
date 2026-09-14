import { useState, useCallback } from 'react'

// -----------------------------------------------------------------------------
// useLocalStorage
// -----------------------------------------------------------------------------
// A tiny wrapper around useState that also persists the value to the browser's
// localStorage. This is the single storage primitive for the whole app — there
// is no backend, so all progress lives here in the user's browser.
//
// Usage:
//   const [value, setValue] = useLocalStorage('key', defaultValue)
//   setValue(newValue)                 // like setState
//   setValue(prev => ({ ...prev }))    // functional update also works
//
// Everything is wrapped in try/catch because localStorage can throw (private
// mode, storage disabled/full) — if it fails we just fall back to in-memory
// state so the app keeps working.
// -----------------------------------------------------------------------------

export function useLocalStorage(key, initialValue) {
  // Lazy initializer: read from localStorage only once, on first render.
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      // If nothing is stored yet, use the provided default.
      return raw !== null ? JSON.parse(raw) : initialValue
    } catch (err) {
      console.warn(`useLocalStorage: could not read "${key}"`, err)
      return initialValue
    }
  })

  // Setter that mirrors React's setState API and writes through to localStorage.
  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        // Support both a plain value and a functional updater (prev => next).
        const next = typeof value === 'function' ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch (err) {
          console.warn(`useLocalStorage: could not write "${key}"`, err)
        }
        return next
      })
    },
    [key],
  )

  return [storedValue, setValue]
}

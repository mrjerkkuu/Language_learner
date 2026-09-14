import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEYS } from '../lib/storageKeys'

// -----------------------------------------------------------------------------
// useTheme
// -----------------------------------------------------------------------------
// Light/dark theme control. Stored value is 'light' | 'dark' | null (= follow
// the system setting). Applying a value sets data-theme on <html>, which flips
// the CSS color tokens (see index.css). index.html also applies the stored
// value before render to avoid a flash.
// -----------------------------------------------------------------------------

const KEY = STORAGE_KEYS.theme // keep in sync with the early script in index.html

function readStored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readStored) // 'light' | 'dark' | null

  useEffect(() => {
    const root = document.documentElement
    try {
      if (theme) {
        root.dataset.theme = theme
        localStorage.setItem(KEY, theme)
      } else {
        delete root.dataset.theme
        localStorage.removeItem(KEY)
      }
    } catch {
      /* ignore storage errors */
    }
  }, [theme])

  // Whether dark is currently active (explicit choice, else the system setting).
  const systemDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  const isDark = theme ? theme === 'dark' : systemDark

  // Toggle to the opposite of what's currently showing (becomes an explicit choice).
  const toggle = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark])

  return { isDark, toggle }
}

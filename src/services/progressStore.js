// -----------------------------------------------------------------------------
// progressStore — the single boundary for reading/writing USER PROGRESS.
// -----------------------------------------------------------------------------
// Same idea as contentService/aiService: one place that "talks to storage", so
// the hooks (useSpacedRepetition, useActivityLog) depend on this interface, not
// on localStorage directly.
//
// Today the only backend is the browser's localStorage. In Vaihe 3, when the
// user is logged in, this file gains a server-backed implementation behind the
// SAME method names (load/save spaced-repetition + activity), so the hooks —
// and therefore every module — do not change. That's the whole point of the
// abstraction: swap the internals here, not the call sites.
//
// (UI-only preferences like language + theme deliberately stay on useLocalStorage;
// this store is for progress that will eventually live on the server.)
// -----------------------------------------------------------------------------

import { STORAGE_KEYS, srsDataKey } from '../lib/storageKeys'

// Low-level read/write, wrapped in try/catch because localStorage can throw
// (private mode, disabled, full). On any failure we fall back to the default so
// the app keeps working in-memory for the session.
function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch (err) {
    console.warn(`progressStore: could not read "${key}"`, err)
    return fallback
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`progressStore: could not write "${key}"`, err)
  }
}

export const progressStore = {
  // --- Spaced repetition (per language) ---
  loadSpacedRepetition(lang) {
    return read(srsDataKey(lang), {})
  },
  saveSpacedRepetition(lang, data) {
    write(srsDataKey(lang), data)
  },

  // --- Activity log (per day) ---
  loadActivity() {
    return read(STORAGE_KEYS.activityLog, { sessions: [] })
  },
  saveActivity(log) {
    write(STORAGE_KEYS.activityLog, log)
  },
}

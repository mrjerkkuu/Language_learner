// -----------------------------------------------------------------------------
// progressStore — the single boundary for reading/writing USER PROGRESS.
// -----------------------------------------------------------------------------
// Same idea as contentService/aiService: one place that "talks to storage", so
// the hooks (useSpacedRepetition, useActivityLog) depend on this interface, not
// on localStorage or apiClient directly.
//
// Vaihe 3: dual backend. Logged-in users go through the server (apiClient),
// everyone else (anon/demo, or on a server/network failure) uses localStorage.
// `setAuthState` is pushed in by AuthContext whenever auth status resolves or
// changes — this module is a plain object, not a hook, so it can't call
// useAuth() itself. This mirrors the module-level state pattern apiClient.js
// already uses for its in-memory CSRF token cache.
//
// The server is authoritative for the actual SR weight math (it runs the same
// srLogic.applyResult — see server/src/routes/progress.js): srLogic is
// imported here too only for the LOCAL/fallback path, so practice never gets
// stuck if the network drops mid-session.
// -----------------------------------------------------------------------------

import { STORAGE_KEYS, srsDataKey } from '../lib/storageKeys'
import { apiClient } from './apiClient'
import { applyResult, defaultCardState } from '../lib/srLogic'
import { addActivity, summarize } from '../lib/activityLogic'

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

let authState = { status: 'anon', userId: null }

function setAuthState(next) {
  authState = next
}

function isAuthed() {
  return authState.status === 'authed'
}

// summarize() (activityLogic.js) names the field `todayCount`; the server's
// summary (server/src/routes/activity.js) names the same field `today`.
// Rename here so both progressStore paths return the identical shape.
function localActivitySummary(log) {
  const { todayCount, ...rest } = summarize(log)
  return { today: todayCount, ...rest }
}

export const progressStore = {
  setAuthState,

  // --- Spaced repetition (per language) ---
  // Always resolves to the same card-map shape either way:
  // { [itemId]: { weight, lastSeen, timesWrong, timesCorrect, learned } }.
  async loadSpacedRepetition(lang) {
    if (isAuthed()) {
      const res = await apiClient.get(`/api/progress?language=${encodeURIComponent(lang)}`)
      if (res.ok) return res.data.items
      console.warn('progressStore: server load failed, falling back to local', res.code)
    }
    return read(srsDataKey(lang), {})
  },

  // Bulk overwrite — only used for a full local reset (see useSpacedRepetition's
  // resetProgress). There is no bulk-write server route (each record call is
  // per-item), so this always writes locally; for a logged-in user it does NOT
  // clear their server-side progress. Acceptable for now (resetProgress isn't
  // exposed in the UI yet) but worth a real "wipe my progress" server route if
  // that ever becomes a user-facing feature.
  saveSpacedRepetition(lang, data) {
    write(srsDataKey(lang), data)
    return Promise.resolve()
  },

  // Records one answer and returns the resulting card. When authed, the
  // server computes the new weight (single source of truth) and this just
  // relays its response. Falls back to computing locally with the same
  // shared srLogic engine on any failure (offline, server error) so a
  // practice session never stalls.
  async recordSpacedRepetition(lang, itemId, correct, currentCard) {
    if (isAuthed()) {
      const res = await apiClient.post('/api/progress/record', { language: lang, itemId, correct })
      if (res.ok) return res.data.item
      console.warn('progressStore: record failed, falling back to local', res.code)
    }
    const updated = applyResult(currentCard ?? defaultCardState(), correct)
    const all = read(srsDataKey(lang), {})
    write(srsDataKey(lang), { ...all, [itemId]: updated })
    return updated
  },

  // --- Activity log ---
  // Both paths always resolve to the same computed-summary shape:
  // { today, weekCount, activeDaysThisWeek, currentStreak, bestStreak }.
  // When authed, the server already computed it from the full history (no
  // point re-deriving it client-side); locally, summarize() (activityLogic.js)
  // is called here so the caller (useActivityLog) never has to branch on
  // which backend answered.
  async loadActivity() {
    if (isAuthed()) {
      const res = await apiClient.get('/api/activity/summary')
      if (res.ok) return res.data
      console.warn('progressStore: server load failed, falling back to local', res.code)
    }
    return localActivitySummary(read(STORAGE_KEYS.activityLog, { sessions: [] }))
  },

  // Bulk overwrite of the raw log. No hook calls this any more (useActivityLog
  // only reads/writes the computed summary via loadActivity/recordActivity),
  // but it's kept as the one escape hatch for writing the raw session array
  // directly (e.g. a future import/migration tool). Same "always local"
  // caveat as saveSpacedRepetition — no bulk-write server route exists.
  saveActivity(log) {
    write(STORAGE_KEYS.activityLog, log)
    return Promise.resolve()
  },

  // Same shape rule as loadActivity: always returns the computed summary,
  // whether the server produced it or it was just derived locally.
  async recordActivity(amount) {
    if (isAuthed()) {
      const res = await apiClient.post('/api/activity/record', { amount })
      if (res.ok) return res.data
      console.warn('progressStore: activity record failed, falling back to local', res.code)
    }
    const current = read(STORAGE_KEYS.activityLog, { sessions: [] })
    const updated = addActivity(current, amount)
    write(STORAGE_KEYS.activityLog, updated)
    return localActivitySummary(updated)
  },
}

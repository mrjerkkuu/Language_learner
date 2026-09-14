// -----------------------------------------------------------------------------
// storageKeys — the single registry of localStorage keys used by the app.
// -----------------------------------------------------------------------------
// Every persistent key lives here so there are no magic strings scattered across
// hooks/services, and so the set is enumerable (useful when the backend lands and
// we need to migrate/import the guest's local progress on first login).
//
// Keys are VERSIONED (`-v1`): bump the version when a value's shape changes so a
// new build doesn't try to read an incompatible old value.
//
// NOTE: the theme key is ALSO referenced by the early inline script in
// index.html (it runs before the JS bundle to avoid a flash), so it cannot
// import from here. If you ever rename `theme`, update index.html too.
// -----------------------------------------------------------------------------

export const STORAGE_KEYS = {
  // Progress (per user, will move to the backend in Vaihe 3 via progressStore)
  activityLog: 'activity-log-v1',
  // Spaced repetition is per-language, so its key is built via srsDataKey(lang).
  srsDataPrefix: 'srs-data-v1',

  // UI / settings (stay local even after the backend exists)
  language: 'language-v1',
  theme: 'theme-v1', // keep in sync with index.html early script
  aiSettings: 'ai-settings-v1',
}

// Per-language spaced-repetition key, e.g. srsDataKey('sv') -> 'srs-data-v1:sv'.
export const srsDataKey = (lang) => `${STORAGE_KEYS.srsDataPrefix}:${lang}`

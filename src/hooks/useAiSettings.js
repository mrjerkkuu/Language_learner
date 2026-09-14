import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '../lib/storageKeys'

// -----------------------------------------------------------------------------
// useAiSettings
// -----------------------------------------------------------------------------
// Manages the (optional) AI settings: the user's own API key and which provider
// it belongs to. Stored ONLY in this browser's localStorage and never sent
// anywhere except directly to the chosen provider's API (see aiService.js).
//
// In the MVP there is no AI yet — this hook simply gives a future Settings
// screen a place to read/write the key. aiService reads the same stored value.
//
// SECURITY NOTE: on GitHub Pages (static hosting) there is no server to hide a
// key, so the key must come from the user at runtime and stay local — it must
// never be baked into the build. See the project plan for details.
// -----------------------------------------------------------------------------

const STORAGE_KEY = STORAGE_KEYS.aiSettings

const DEFAULT_SETTINGS = { apiKey: '', provider: 'none' } // provider: none | gemini | claude

export function useAiSettings() {
  const [settings, setSettings] = useLocalStorage(STORAGE_KEY, DEFAULT_SETTINGS)

  const setApiKey = useCallback(
    (apiKey) => setSettings((prev) => ({ ...prev, apiKey: apiKey.trim() })),
    [setSettings],
  )

  const setProvider = useCallback(
    (provider) => setSettings((prev) => ({ ...prev, provider })),
    [setSettings],
  )

  // Remove the stored key/provider (a "forget my key" action).
  const clear = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings])

  return {
    apiKey: settings.apiKey ?? '',
    provider: settings.provider ?? 'none',
    hasKey: Boolean(settings.apiKey) && settings.provider !== 'none',
    setApiKey,
    setProvider,
    clear,
  }
}

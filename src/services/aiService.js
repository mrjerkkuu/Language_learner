// -----------------------------------------------------------------------------
// aiService — single, provider-agnostic interface for ALL AI communication.
// -----------------------------------------------------------------------------
// In the MVP there is NO AI. This file exists so AI features (writing feedback,
// smarter quiz distractors) can be dropped in later WITHOUT touching the module
// components. The modules already call these functions today; they just return
// null until a key + implementation exist, and the modules fall back to their
// non-AI behaviour when they get null.
//
// The return-value SHAPE is fixed here and stays the same regardless of which
// provider is used, so switching provider (e.g. Gemini -> Claude) only changes
// this file, never the modules.
//
// Key handling (see project plan): the key is read from the user's own settings
// (localStorage) at runtime, or from a .env.local variable during local dev. It
// is never committed and, in production, never baked into the build.
// -----------------------------------------------------------------------------

const AI_SETTINGS_KEY = 'ai-settings-v1' // must match useAiSettings STORAGE_KEY

// Read the stored AI settings ({ apiKey, provider }) directly from localStorage.
// Kept as a plain function (not a hook) so non-React code can call it too.
function getStoredSettings() {
  try {
    const raw = window.localStorage.getItem(AI_SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Ignore read/parse errors and fall through to the env/default below.
  }
  // Dev fallback: Vite exposes VITE_-prefixed vars via import.meta.env.
  // In local `npm run dev` this lets you test with a key from .env.local.
  return {
    apiKey: import.meta.env.VITE_AI_API_KEY ?? '',
    provider: import.meta.env.VITE_AI_PROVIDER ?? 'none',
  }
}

// True when a usable key + provider are configured.
export function isAiEnabled() {
  const { apiKey, provider } = getStoredSettings()
  return Boolean(apiKey) && provider && provider !== 'none'
}

// -----------------------------------------------------------------------------
// checkWriting(text, taskPrompt)
// -----------------------------------------------------------------------------
// Intended to return AI feedback on a Swedish writing answer, in a fixed shape:
//   { corrected: string, feedback: string }  (once implemented)
// Returns null when AI is unavailable, so WritingPractice falls back to simply
// showing the model answer for self-comparison.
export async function checkWriting(text, taskPrompt) {
  const { apiKey /*, provider */ } = getStoredSettings()
  if (!apiKey || !isAiEnabled()) return null

  // TODO (future): call the selected provider and map its response to
  //   { corrected, feedback }. Left unimplemented on purpose in the MVP.
  return null
}

// -----------------------------------------------------------------------------
// generateDistractors(word, category)
// -----------------------------------------------------------------------------
// Intended to return an array of tricky-but-wrong answer options for the quiz.
// Returns null when AI is unavailable, so Quiz falls back to picking distractors
// from the same category/part in the local data.
export async function generateDistractors(word, category) {
  const { apiKey /*, provider */ } = getStoredSettings()
  if (!apiKey || !isAiEnabled()) return null

  // TODO (future): ask the provider for 2-3 plausible wrong options and return
  //   them as an array of strings. Left unimplemented on purpose in the MVP.
  return null
}

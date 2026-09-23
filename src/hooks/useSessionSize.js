import { useLocalStorage } from './useLocalStorage'
import { normalizeSessionSize } from '../lib/sessionLogic'

// -----------------------------------------------------------------------------
// useSessionSize
// -----------------------------------------------------------------------------
// The last session size a module used (5/10/15/20), remembered in localStorage
// under the module's own key (STORAGE_KEYS.flashcardSessionSize /
// formsSessionSize), so each module keeps its own choice. An unknown or
// corrupted stored value falls back to `fallback`.
// -----------------------------------------------------------------------------

export function useSessionSize(storageKey, fallback) {
  const [stored, setStored] = useLocalStorage(storageKey, fallback)
  return [normalizeSessionSize(stored, fallback), setStored]
}

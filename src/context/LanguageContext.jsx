import { createContext, useContext, useMemo, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { LANGUAGES, DEFAULT_LANGUAGE } from '../data/languages'
import { getContent } from '../data/contentService'

// -----------------------------------------------------------------------------
// LanguageContext
// -----------------------------------------------------------------------------
// Holds the currently selected target language and exposes that language's
// content + label helpers. The selection is persisted in localStorage.
//
// Because switching language changes the whole content set (and the areas /
// categories differ per language), App remounts the routed subtree on language
// change (key={lang}) so per-language state — spaced repetition, the filter —
// re-initialises cleanly.
// -----------------------------------------------------------------------------

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useLocalStorage('language-v1', DEFAULT_LANGUAGE)

  const value = useMemo(() => {
    const content = getContent(lang)
    const language = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0]

    // Label helpers bound to the CURRENT language's areas/categories.
    const partLabel = (id) => content.PARTS.find((p) => p.id === id)?.label ?? `Osa ${id}`
    const categoryLabel = (id) => content.CATEGORIES.find((c) => c.id === id)?.label ?? id

    return { lang, setLang, languages: LANGUAGES, language, content, partLabel, categoryLabel }
  }, [lang, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside a <LanguageProvider>')
  return ctx
}

// Convenience: just the current language's content bundle.
export function useContent() {
  return useLanguage().content
}

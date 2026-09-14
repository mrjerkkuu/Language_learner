// contentService — the single place that maps a language id to its content.
//
// This is the app's data-access layer. Modules never import a language's JSON
// directly; they read the current language's content via useContent() (see
// context/LanguageContext.jsx). Keeping it isolated here means the source can
// later be swapped from bundled JSON to a backend API without touching modules.

import svVocabulary from './sv/vocabulary.json'
import svPhrases from './sv/phrases.json'
import svWritingTasks from './sv/writingTasks.json'
import svFillBlanks from './sv/fillBlanks.json'
import svWordForms from './sv/wordForms.json'
import { PARTS as svParts, CATEGORIES as svCategories } from './sv/categories'

import enVocabulary from './en/vocabulary.json'
import enPhrases from './en/phrases.json'
import enWritingTasks from './en/writingTasks.json'
import enFillBlanks from './en/fillBlanks.json'
import enWordForms from './en/wordForms.json'
import { PARTS as enParts, CATEGORIES as enCategories } from './en/categories'

import { DEFAULT_LANGUAGE } from './languages'

const CONTENT = {
  sv: {
    vocabulary: svVocabulary,
    phrases: svPhrases,
    writingTasks: svWritingTasks,
    fillBlanks: svFillBlanks,
    wordForms: svWordForms,
    PARTS: svParts,
    CATEGORIES: svCategories,
  },
  en: {
    vocabulary: enVocabulary,
    phrases: enPhrases,
    writingTasks: enWritingTasks,
    fillBlanks: enFillBlanks,
    wordForms: enWordForms,
    PARTS: enParts,
    CATEGORIES: enCategories,
  },
}

// Return the content bundle for a language, falling back to the default.
export function getContent(langId) {
  return CONTENT[langId] ?? CONTENT[DEFAULT_LANGUAGE]
}

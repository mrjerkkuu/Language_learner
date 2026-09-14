// Registry of target languages the user can practise.
//
// - id:          internal key + data folder name (src/data/<id>/…)
// - label:       Finnish UI name (the app UI is in Finnish)
// - nativeLabel: shown on the flashcard front (the target language's own name)
//
// To add a language later: add an entry here + a src/data/<id>/ folder with the
// same files, and register it in contentService.js.
// - inLang: Finnish translative ("write in ___") used in placeholder text
export const LANGUAGES = [
  { id: 'sv', label: 'Ruotsi', nativeLabel: 'Svenska', inLang: 'ruotsiksi' },
  { id: 'en', label: 'Englanti', nativeLabel: 'English', inLang: 'englanniksi' },
]

export const DEFAULT_LANGUAGE = 'sv'

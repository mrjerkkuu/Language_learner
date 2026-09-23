// Flatten a language's word-form data into one list of practice items
// (each carries part + category, so filters and counters can use it).
// Swedish data is { source, verbs, nouns } (generated from SALDO); a language
// without word-form data has none. The plain-array case is the legacy English
// format, kept only until English Muodot is hidden.
export function wordFormItems(wordForms) {
  if (!wordForms) return []
  if (Array.isArray(wordForms)) return wordForms
  return [...wordForms.verbs, ...wordForms.nouns]
}

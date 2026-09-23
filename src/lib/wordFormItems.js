// Flatten a language's word-form data into one list of practice items
// (each carries part + category, so filters and counters can use it).
// Swedish data is { source, verbs, nouns } (generated from SALDO); a language
// without word-form data (English, for now) has null.
export function wordFormItems(wordForms) {
  if (!wordForms) return []
  return [...wordForms.verbs, ...wordForms.nouns]
}

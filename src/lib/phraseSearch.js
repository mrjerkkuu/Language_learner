// Case-insensitive substring match against a phrase's target-language term
// and its Finnish translation, so search works regardless of which
// language the user types in.
export function searchPhrases(phrases, query) {
  const q = query.trim().toLowerCase()
  if (!q) return phrases
  return phrases.filter(
    (p) => p.term.toLowerCase().includes(q) || p.fi.toLowerCase().includes(q),
  )
}

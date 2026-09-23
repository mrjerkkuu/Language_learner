// -----------------------------------------------------------------------------
// saldoForms — pure rules for turning SALDO morphology entries into word forms.
// -----------------------------------------------------------------------------
// Used by scripts/fetch-saldo-forms.mjs, which queries Språkbanken's Karp API
// (resource "saldom", CC BY 4.0) and writes src/data/sv/wordForms.json. All the
// DECISIONS live here so they are unit-tested; the script only does I/O.
//
// A SALDO entry looks like:
//   { lemgram: 'gå..vb.1', baseform: 'gå', partOfSpeech: 'vb', inherent: [],
//     inflectionTable: [{ msd: 'pres ind aktiv', writtenForm: 'går' }, ...] }
//
// Rules (agreed in the K3 plan):
//   - only unambiguous matches are accepted; no match -> the word is left out
//   - when SALDO lists variants for one form (bli/bliva), the FIRST one is used
//   - verb phrases are tried longest-first (klara av provet -> klara av -> klara)
//   - remaining ambiguity is resolved by category or an explicit sense override
// -----------------------------------------------------------------------------

export const VERB_MSD = {
  infinitiv: 'inf aktiv',
  presens: 'pres ind aktiv',
  preteritum: 'pret ind aktiv',
  supinum: 'sup aktiv',
}

export const NOUN_MSD = {
  sgIndef: 'sg indef nom',
  sgDef: 'sg def nom',
  plIndef: 'pl indef nom',
  plDef: 'pl def nom',
}

// Categories whose nouns name an activity or a field ("fotboll", "bioekonomi").
// If SALDO has both a countable and an uncountable reading, the uncountable
// one is meant here.
export const UNCOUNTABLE_CATEGORIES = ['harrastukset', 'alat']

// Categories where the plural is never asked (field names are not used in the
// plural even when SALDO has a plural form).
export const NO_PLURAL_CATEGORIES = ['alat']

// Explicit sense choices where SALDO has several senses with different forms.
// Keyed by the vocabulary term; chosen from the Finnish translation.
export const SENSE_OVERRIDES = {
  'att vara sambo': 'vara..vb.1', // "olla" (är/var), not vara..vb.2 "kestää" (varar)
  'en fil': 'fil..nn.1', // "tiedosto" (computer file -> filer), not a file tool (filar)
  'ett prov': 'prov..nn.1', // "koe" (test -> prov), not a sample (prover)
}

// Map msd -> first writtenForm (SALDO lists the modern/default variant first).
export function firstForms(entry) {
  const table = {}
  for (const { msd, writtenForm } of entry.inflectionTable ?? []) {
    if (!(msd in table)) table[msd] = writtenForm
  }
  return table
}

// Pick the named forms from an entry; missing forms become null.
function pickForms(entry, msdMap) {
  const table = firstForms(entry)
  return Object.fromEntries(Object.entries(msdMap).map(([key, msd]) => [key, table[msd] ?? null]))
}

// All four verb forms, or null if any is missing.
export function extractVerbForms(entry) {
  const forms = pickForms(entry, VERB_MSD)
  return Object.values(forms).every(Boolean) ? forms : null
}

// Singular forms are required; plural forms may be null (uncountable nouns).
export function extractNounForms(entry) {
  const forms = pickForms(entry, NOUN_MSD)
  return forms.sgIndef && forms.sgDef ? forms : null
}

// "att klara av provet/tentan" -> { kind: 'infinitive', candidates: ['klara av provet', 'klara av', 'klara'] }
// "Flyttade fram"              -> { kind: 'preterite',  candidates: ['flyttade fram', 'flyttade'] }
// Candidates go longest-first so a particle verb wins over its bare main verb.
export function parseVerbTerm(term) {
  const isInfinitive = term.startsWith('att ')
  const text = (isInfinitive ? term.slice(4) : term).split(/[/(]/)[0].trim().toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)
  const candidates = words.map((_, i) => words.slice(0, words.length - i).join(' '))
  return { kind: isInfinitive ? 'infinitive' : 'preterite', candidates }
}

// "en helg" -> { gender: 'en', word: 'helg' }. Multi-word or punctuated terms
// ("en valfri kurs", "en catering(-bransch)", "en man/make") -> null (left out).
export function parseNounTerm(term) {
  const m = /^(en|ett) ([\p{L}-]+)$/u.exec(term)
  return m ? { gender: m[1], word: m[2] } : null
}

const formKey = (forms) => JSON.stringify(forms)

// Group entries by identical forms; one group means the forms are unambiguous
// even if SALDO has several senses (lemgrams) behind them.
function groupByForms(entries, extract) {
  const groups = new Map()
  for (const entry of entries) {
    const forms = extract(entry)
    if (!forms) continue
    const key = formKey(forms)
    if (!groups.has(key)) groups.set(key, { forms, entry })
  }
  return [...groups.values()]
}

// Result shapes: { status: 'ok', entry, forms } | { status: 'none' } | { status: 'ambiguous', options }
function decide(groups, override) {
  if (override) {
    const hit = groups.find((g) => g.entry.lemgram === override)
    if (hit) return { status: 'ok', entry: hit.entry, forms: hit.forms }
  }
  if (groups.length === 0) return { status: 'none' }
  if (groups.length === 1) return { status: 'ok', entry: groups[0].entry, forms: groups[0].forms }
  return { status: 'ambiguous', options: groups }
}

// Choose the verb entry for ONE candidate phrase. `entries` are the SALDO hits
// for that candidate (by baseform for infinitives, by written form for
// preterites). A multi-word candidate must match a multi-word verb (vbm).
export function selectVerbEntry(entries, candidate, kind, override = null) {
  const multiWord = candidate.includes(' ')
  const matching = entries.filter((e) => {
    if (e.partOfSpeech !== (multiWord ? 'vbm' : 'vb')) return false
    if (kind === 'infinitive') return e.baseform === candidate
    return firstForms(e)[VERB_MSD.preteritum] === candidate
  })
  // An override only applies to the sense list it names.
  return decide(groupByForms(matching, extractVerbForms), override)
}

// Choose the noun entry. SALDO gender: 'u' = en, 'n' = ett, 'v' = either.
export function selectNounEntry(entries, { word, gender }, category, override = null) {
  const wanted = gender === 'en' ? 'u' : 'n'
  const matching = entries.filter(
    (e) =>
      e.partOfSpeech === 'nn' &&
      e.baseform === word &&
      (e.inherent ?? []).some((g) => g === wanted || g === 'v'),
  )
  let groups = groupByForms(matching, extractNounForms)
  if (groups.length > 1 && !override) groups = preferByCountability(groups, category)
  return decide(groups, override)
}

// Countable vs uncountable readings of the same noun: activity/field categories
// take the uncountable one, everything else the countable one.
function preferByCountability(groups, category) {
  const uncountable = UNCOUNTABLE_CATEGORIES.includes(category)
  const filtered = groups.filter((g) => Boolean(g.forms.plIndef) !== uncountable)
  return filtered.length > 0 ? filtered : groups
}

export function shouldAskPlural(forms, category) {
  return Boolean(forms.plIndef && forms.plDef) && !NO_PLURAL_CATEGORIES.includes(category)
}

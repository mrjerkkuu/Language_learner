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

const isReflexiveSig = (form) => /(^|\s)sig(\s|$)/.test(form)

// Map msd -> first writtenForm (SALDO lists the modern/default variant first).
// Exception: reflexive verbs list every pronoun (inrikta mig/dig/sig/...), and
// the dictionary form uses "sig", so that variant wins.
export function firstForms(entry) {
  const table = {}
  for (const { msd, writtenForm } of entry.inflectionTable ?? []) {
    if (!(msd in table) || (isReflexiveSig(writtenForm) && !isReflexiveSig(table[msd]))) {
      table[msd] = writtenForm
    }
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

// Definite-singular ending per article: en -> -n (helgen), ett -> -t (vädret).
const DEF_SG_ENDING = { en: 'n', ett: 't' }

// Singular forms are required; plural forms may be null (uncountable nouns).
// SALDO gender "v" (either article) lists one definite singular per gender
// (poängen / poänget); with `gender` given, the variant matching it is used.
export function extractNounForms(entry, gender = null) {
  const forms = pickForms(entry, NOUN_MSD)
  const ending = DEF_SG_ENDING[gender]
  if (ending && (entry.inherent ?? []).includes('v') && !forms.sgDef?.endsWith(ending)) {
    const match = (entry.inflectionTable ?? []).find(
      (r) => r.msd === NOUN_MSD.sgDef && r.writtenForm.endsWith(ending),
    )
    if (match) forms.sgDef = match.writtenForm
  }
  return forms.sgIndef && forms.sgDef ? forms : null
}

// "att klara av provet/tentan" -> { kind: 'infinitive', candidates: ['klara av provet', 'klara av', 'klara'] }
// "Flyttade fram"              -> { kind: 'preterite',  candidates: ['flyttade fram', 'flyttade'] }
// Candidates go longest-first so a particle verb wins over its bare main verb.
export function parseVerbTerm(term) {
  const isInfinitive = term.startsWith('att ')
  const text = (isInfinitive ? term.slice(4) : term).split(/[/(]/)[0].trim().toLowerCase()
  // "Föreställde mig" -> "föreställde sig": match SALDO's dictionary form.
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && (w === 'mig' || w === 'dig') ? 'sig' : w))
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
  let groups = groupByForms(matching, (e) => extractNounForms(e, gender))
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

// --- Compound nouns (second source: declension classes from a study PDF) -----
// A Swedish compound inflects like its last part (yrkes|högskola -> yrkes|högskolor),
// so a compound SALDO lacks takes the forms of its head word, prefixed. That is
// only accepted when an independent source agrees: the declension class (or the
// forms) the PDF gives for the word must match SALDO's paradigm for the head.
// Words the PDF says nothing about are never derived (robotik -> "tik" is wrong).

// Marks rows derived this way; the value names the checking source.
export const COMPOUND_CHECK = 'kananoja-2026'

// "yrkeshögskola" -> [{ prefix: 'y', head: 'rkeshögskola' }, ..., { prefix: 'yrkeshögs', head: 'kola' }]
// Proper suffixes only, longest head first, heads at least `minLength` letters.
export function headCandidates(word, minLength = 3) {
  const out = []
  for (let i = 1; i <= word.length - minLength; i++) out.push({ prefix: word.slice(0, i), head: word.slice(i) })
  return out
}

// SALDO paradigm name -> school declension 1-5. SALDO numbers the last two
// classes differently: nn_5n_dike (-n plural) is school class 4, nn_6u_kikare
// (no plural ending) is class 5. Anything else (nn_0 uncountable, irregular) -> null.
const SALDO_TO_SCHOOL = { 1: 1, 2: 2, 3: 3, 5: 4, 6: 5 }
export function saldoDeclension(paradigm) {
  const m = /^nn_(\d)/.exec(paradigm ?? '')
  return m ? (SALDO_TO_SCHOOL[m[1]] ?? null) : null
}

// Does the PDF's statement about a word agree with the SALDO head entry?
//   { declension: 3 }                                  -> paradigm class matches
//   { headForms: ['examen','examen','examina','examina'] } -> head's four forms match
//   { sgDefEnding: 'en' }                              -> head's definite singular ends so
export function pdfAgrees(check, entry, headForms) {
  if (!check || !entry || !headForms) return false
  if (check.declension != null) return saldoDeclension(entry.paradigm) === check.declension
  if (check.headForms) {
    const { sgIndef, sgDef, plIndef, plDef } = headForms
    return JSON.stringify([sgIndef, sgDef, plIndef, plDef]) === JSON.stringify(check.headForms)
  }
  if (check.sgDefEnding) return Boolean(headForms.sgDef?.endsWith(check.sgDefEnding))
  return false
}

// Put the compound's first part in front of every existing form.
export function prefixForms(prefix, forms) {
  return Object.fromEntries(Object.entries(forms).map(([k, v]) => [k, v ? prefix + v : null]))
}

// Decide a compound from the FIRST head that SALDO knows (a selectNounEntry
// result for that head). Anything but an unambiguous, PDF-confirmed match is
// rejected; the caller then stops rather than trying a shorter head.
export function decideCompound({ prefix, head }, headResult, check) {
  if (headResult.status !== 'ok' || !pdfAgrees(check, headResult.entry, headResult.forms)) {
    return { status: 'rejected', head }
  }
  return { status: 'ok', entry: headResult.entry, head, forms: prefixForms(prefix, headResult.forms) }
}

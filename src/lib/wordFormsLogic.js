import { shuffle as defaultShuffle } from '../utils/shuffle'

// -----------------------------------------------------------------------------
// wordFormsLogic — pure logic for the Muodot (word forms) module.
// -----------------------------------------------------------------------------
// One practice task = one word's whole inflection chain, asked step by step.
// Each STEP is its own spaced-repetition card (`<item id>:<step key>`), so a
// verb can be learned in the present tense but still weak in the supine.
// Word selection works on an aggregated per-word state built from those cards,
// so the existing srLogic.pickNext can pick words unchanged.
//
// Items come from src/data/sv/wordForms.json (generated from SALDO):
//   verb: { id, forms: { infinitiv, presens, preteritum, supinum }, ... }
//   noun: { id, gender, forms: { sgIndef, sgDef, plIndef, plDef }, askPlural, ... }
// -----------------------------------------------------------------------------

export const VERB_STEPS = ['presens', 'preteritum', 'supinum']
export const GENDER_OPTIONS = ['en', 'ett']

export const wordKind = (item) => (item.gender ? 'noun' : 'verb')

// Step keys asked for an item, in order.
export function stepKeys(item) {
  if (wordKind(item) === 'verb') return VERB_STEPS
  return ['gender', 'sgDef', ...(item.askPlural ? ['plIndef', 'plDef'] : [])]
}

export const cardId = (item, key) => `${item.id}:${key}`

export const answerFor = (item, key) => (key === 'gender' ? item.gender : item.forms[key])

// Options for one step: the word's OWN forms (all real Swedish, and they test
// exactly the form distinction), de-duplicated because e.g. "jobb" is both the
// singular and the plural. The gender step is always en / ett in fixed order.
export function formOptions(item, key, shuffle = defaultShuffle) {
  if (key === 'gender') return GENDER_OPTIONS
  const forms = Object.values(item.forms).filter(Boolean)
  return shuffle([...new Set(forms)])
}

// The whole task for one item: [{ key, cardId, answer, options }].
export function buildSteps(item, shuffle = defaultShuffle) {
  return stepKeys(item).map((key) => ({
    key,
    cardId: cardId(item, key),
    answer: answerFor(item, key),
    options: formOptions(item, key, shuffle),
  }))
}

// Per-word card state from its step cards, in srLogic's card shape:
//   weight   = the HARDEST step decides (so a weak form brings the word back)
//   lastSeen = the most recent step
//   learned  = only when every step is learned
export function aggregateWordState(getState, item) {
  const cards = stepKeys(item).map((key) => getState(cardId(item, key)))
  return {
    weight: Math.max(...cards.map((c) => c.weight)),
    lastSeen: Math.max(...cards.map((c) => c.lastSeen)),
    timesCorrect: cards.reduce((sum, c) => sum + c.timesCorrect, 0),
    timesWrong: cards.reduce((sum, c) => sum + c.timesWrong, 0),
    learned: cards.every((c) => c.learned),
  }
}

// { [item.id]: aggregated state } — the dataMap srLogic.pickNext expects.
export function wordStateMap(getState, items) {
  return Object.fromEntries(items.map((item) => [item.id, aggregateWordState(getState, item)]))
}

// Items for the Kaikki / Verbit / Substantiivit toggle.
export function itemsOfKind(wordForms, kind) {
  if (!wordForms) return []
  if (kind === 'verbs') return wordForms.verbs
  if (kind === 'nouns') return wordForms.nouns
  return [...wordForms.verbs, ...wordForms.nouns]
}

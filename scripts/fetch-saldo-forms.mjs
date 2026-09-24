#!/usr/bin/env node
// -----------------------------------------------------------------------------
// fetch-saldo-forms — generate src/data/sv/wordForms.json from SALDO.
// -----------------------------------------------------------------------------
// Run by hand (Node 22):  node scripts/fetch-saldo-forms.mjs [--verify]
//
// Reads the Swedish vocabulary, looks every verb and single-word noun up in
// SALDO's morphology (Språkbanken Text, University of Gothenburg, CC BY 4.0)
// through the Karp v7 API, and writes the inflection data. All selection rules
// live in src/lib/saldoForms.js (unit-tested); this script only does I/O.
//
// Compound nouns SALDO lacks (yrkeshögskola) take the forms of their last part
// (högskola), but ONLY when a second, independent source agrees: the
// declension classes in scripts/data/declensions-kananoja.json (from a study
// PDF). Such rows keep the head's lemgram and are marked with `head` + `check`.
//
// --verify  re-fetches 5 random rows plus 5 random compound rows from the
//           written file by lemgram and checks the forms still match (spot
//           check, writes nothing).
//
// The app never calls SALDO at runtime; the generated JSON is committed.
// -----------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  COMPOUND_CHECK,
  SENSE_OVERRIDES,
  decideCompound,
  extractNounForms,
  headCandidates,
  pdfAgrees,
  prefixForms,
  extractVerbForms,
  parseNounTerm,
  parseVerbTerm,
  selectNounEntry,
  selectVerbEntry,
  shouldAskPlural,
} from '../src/lib/saldoForms.js'

const API = 'https://spraakbanken4.it.gu.se/karp/v7/query/saldom'
const PAGE_SIZE = 100
const CONCURRENCY = 6
const REQUEST_TIMEOUT_MS = 20_000
const VERB_CATEGORY = 'cvverbit' // CV verbs are stored in the preterite

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const VOCAB_PATH = root('src/data/sv/vocabulary.json')
const OUT_PATH = root('src/data/sv/wordForms.json')
const DECLENSIONS_PATH = root('scripts/data/declensions-kananoja.json')
const declensions = JSON.parse(readFileSync(DECLENSIONS_PATH, 'utf8'))

// --- SALDO access -----------------------------------------------------------

const cache = new Map()

async function fetchJson(url) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Timeout so a stalled request is retried instead of hanging the run.
      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return await res.json()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

// All entries matching `field == value` with the given part of speech,
// following pagination so large result sets are never cut off.
async function query(field, value, pos) {
  const key = `${field}|${value}|${pos}`
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const q = `and(equals|${field}|${value}||equals|partOfSpeech|${pos})`
        const entries = []
        for (let from = 0; ; from += PAGE_SIZE) {
          const url = `${API}?size=${PAGE_SIZE}&from=${from}&q=${encodeURIComponent(q)}`
          const data = await fetchJson(url)
          entries.push(...data.hits.map((h) => h.entry))
          if (entries.length >= data.total || data.hits.length === 0) return entries
        }
      })(),
    )
  }
  return cache.get(key)
}

// Run `fn` over `items` with limited parallelism, preserving order.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

// --- Lookup -----------------------------------------------------------------

async function lookupVerb(item) {
  const { kind, candidates } = parseVerbTerm(item.term)
  const override = SENSE_OVERRIDES[item.term] ?? null
  for (const candidate of candidates) {
    const pos = candidate.includes(' ') ? 'vbm' : 'vb'
    const field = kind === 'infinitive' ? 'baseform' : 'inflectionTable.writtenForm'
    const entries = await query(field, candidate, pos)
    const result = selectVerbEntry(entries, candidate, kind, override)
    // Longest phrase wins; ambiguity stops the search (never silently shortened).
    if (result.status !== 'none') return { item, ...result }
  }
  return { item, status: 'none' }
}

async function lookupNoun(item) {
  const parsed = parseNounTerm(item.term)
  if (!parsed) return { item, status: 'skipped' }
  const entries = await query('baseform', parsed.word, 'nn')
  const override = SENSE_OVERRIDES[item.term] ?? null
  const check = declensions.words[item.term]
  const direct = selectNounEntry(entries, parsed, item.category, override)
  if (direct.status === 'ok') {
    // A direct SALDO hit stands on its own (K3 rule); where the PDF also names
    // the word, a disagreement leaves the word out instead.
    const pdf = check ? (pdfAgrees(check, direct.entry, direct.forms) ? 'agrees' : 'disagrees') : null
    if (pdf === 'disagrees') return { item, status: 'pdf-conflict', lemgram: direct.entry.lemgram }
    return { item, gender: parsed.gender, pdf, ...direct }
  }
  if (direct.status !== 'none' || !check) return { item, gender: parsed.gender, ...direct }
  return { item, gender: parsed.gender, ...(await lookupCompound(parsed, item.category, check)) }
}

// Try the compound's heads longest-first; the first head SALDO knows decides.
async function lookupCompound({ word, gender }, category, check) {
  for (const candidate of headCandidates(word)) {
    const entries = await query('baseform', candidate.head, 'nn')
    const result = selectNounEntry(entries, { word: candidate.head, gender }, category)
    if (result.status === 'none') continue
    const decided = decideCompound(candidate, result, check)
    return decided.status === 'ok' ? { ...decided, compound: true } : { status: 'compound-rejected', head: decided.head }
  }
  return { status: 'none' }
}

// --- Build ------------------------------------------------------------------

function buildVerbs(results) {
  // Several vocabulary rows can share one verb (att välja + Valde): one chain each.
  const byLemgram = new Map()
  for (const r of results.filter((r) => r.status === 'ok')) {
    const existing = byLemgram.get(r.entry.lemgram)
    if (existing) {
      existing.vocabIds.push(r.item.id)
      continue
    }
    byLemgram.set(r.entry.lemgram, {
      id: `wf-vb-${r.item.id}`,
      vocabIds: [r.item.id],
      lemgram: r.entry.lemgram,
      fi: r.item.fi,
      part: r.item.part,
      category: r.item.category,
      forms: r.forms,
    })
  }
  return [...byLemgram.values()]
}

function buildNouns(results) {
  return results
    .filter((r) => r.status === 'ok')
    .map((r) => ({
      id: `wf-nn-${r.item.id}`,
      vocabId: r.item.id,
      lemgram: r.entry.lemgram,
      ...(r.compound ? { head: r.head, check: COMPOUND_CHECK } : {}),
      fi: r.item.fi,
      part: r.item.part,
      category: r.item.category,
      gender: r.gender,
      forms: r.forms,
      askPlural: shouldAskPlural(r.forms, r.item.category),
    }))
}

const today = () => new Date().toISOString().slice(0, 10)

function source() {
  return {
    name: 'SALDO, Språkbanken Text, Göteborgs universitet',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    url: 'https://spraakbanken.gu.se/en/resources/saldom',
    retrieved: today(),
    modified: 'Valikoidut taivutusmuodot poimittu; muotoja ei muutettu',
    compoundCheck: {
      id: COMPOUND_CHECK,
      name: `${declensions.source.author}: ${declensions.source.title}`,
      created: declensions.source.created,
      usedFor:
        'Yhdyssanat (rivit, joilla check = "kananoja-2026"): muodot SALDOsta yhdyssanan loppuosalle (head), ' +
        'hyväksytty vain kun PDF:n taivutusluokka tai muodot täsmäävät',
    },
  }
}

// --- Report -----------------------------------------------------------------

function report(verbResults, nounResults, verbs, nouns) {
  const count = (rs, status) => rs.filter((r) => r.status === status).length
  const line = (r) => `    ${r.item.term} (${r.item.fi}; ${r.item.category})`
  console.log('\n=== SALDO word forms ===')
  console.log(`Verbs: ${count(verbResults, 'ok')} / ${verbResults.length} vocabulary rows -> ${verbs.length} unique chains`)
  console.log(`Nouns: ${count(nounResults, 'ok')} / ${nounResults.length - count(nounResults, 'skipped')} single-word nouns`)
  console.log(`  (multi-word nouns not attempted: ${count(nounResults, 'skipped')})`)
  console.log(`  of which compounds via head + PDF check: ${nounResults.filter((r) => r.compound).length}`)
  console.log(`  direct hits also confirmed by the PDF: ${nounResults.filter((r) => r.pdf === 'agrees').length}`)
  for (const [label, rs] of [
    ['Verbs left out (no match)', verbResults.filter((r) => r.status === 'none')],
    ['Verbs left out (ambiguous)', verbResults.filter((r) => r.status === 'ambiguous')],
    ['Nouns left out (no match)', nounResults.filter((r) => r.status === 'none')],
    ['Nouns left out (ambiguous)', nounResults.filter((r) => r.status === 'ambiguous')],
    ['Nouns left out (compound head rejected by PDF check)', nounResults.filter((r) => r.status === 'compound-rejected')],
    ['Nouns left out (direct hit contradicts the PDF)', nounResults.filter((r) => r.status === 'pdf-conflict')],
  ]) {
    console.log(`\n  ${label}: ${rs.length}`)
    rs.forEach((r) => console.log(line(r)))
  }
  console.log(`\nNouns asking the plural: ${nouns.filter((n) => n.askPlural).length} / ${nouns.length}`)
}

// --- Verify -----------------------------------------------------------------

async function verify() {
  const data = JSON.parse(readFileSync(OUT_PATH, 'utf8'))
  const rows = [...data.verbs.map((r) => ['verb', r]), ...data.nouns.map((r) => ['noun', r])]
  const shuffle = (xs) => xs.sort(() => Math.random() - 0.5)
  const compounds = rows.filter(([, r]) => r.check === COMPOUND_CHECK)
  const sample = [...shuffle(rows).slice(0, 5), ...shuffle(compounds).slice(0, 5)]
  let ok = true
  for (const [type, row] of sample) {
    const pos = row.lemgram.split('..')[1].split('.')[0]
    const [entry] = await query('lemgram', row.lemgram, pos)
    let fresh = entry && (type === 'verb' ? extractVerbForms(entry) : extractNounForms(entry, row.gender))
    // Compound rows: the head's forms with the compound's first part in front.
    if (fresh && row.head) fresh = prefixForms(row.forms.sgIndef.slice(0, -row.head.length), fresh)
    const same = JSON.stringify(fresh) === JSON.stringify(row.forms)
    ok &&= same
    console.log(`${same ? 'OK  ' : 'DIFF'} ${row.lemgram}  ${Object.values(row.forms).filter(Boolean).join(' / ')}`)
  }
  process.exitCode = ok ? 0 : 1
}

// --- Main -------------------------------------------------------------------

async function main() {
  if (process.argv.includes('--verify')) return verify()

  const vocab = JSON.parse(readFileSync(VOCAB_PATH, 'utf8'))
  const verbItems = vocab.filter((v) => v.term.startsWith('att ') || v.category === VERB_CATEGORY)
  const nounItems = vocab.filter((v) => /^(en|ett) /.test(v.term))

  const verbResults = await mapLimit(verbItems, CONCURRENCY, lookupVerb)
  const nounResults = await mapLimit(nounItems, CONCURRENCY, lookupNoun)

  const verbs = buildVerbs(verbResults)
  const nouns = buildNouns(nounResults)
  writeFileSync(OUT_PATH, JSON.stringify({ source: source(), verbs, nouns }, null, 2) + '\n')

  report(verbResults, nounResults, verbs, nouns)
  console.log(`\nWrote ${OUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

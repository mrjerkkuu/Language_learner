import { describe, it, expect } from 'vitest'
import {
  firstForms,
  extractVerbForms,
  extractNounForms,
  parseVerbTerm,
  parseNounTerm,
  selectVerbEntry,
  selectNounEntry,
  shouldAskPlural,
  COMPOUND_CHECK,
  headCandidates,
  saldoDeclension,
  pdfAgrees,
  prefixForms,
  decideCompound,
} from './saldoForms'

// Minimal SALDO-shaped entries (trimmed from real Karp v7 "saldom" responses).
const verb = (lemgram, pos, [inf, pres, pret, sup], extra = []) => ({
  lemgram,
  baseform: inf,
  partOfSpeech: pos,
  inherent: [],
  inflectionTable: [
    { msd: 'inf aktiv', writtenForm: inf },
    { msd: 'pres ind aktiv', writtenForm: pres },
    { msd: 'pret ind aktiv', writtenForm: pret },
    { msd: 'sup aktiv', writtenForm: sup },
    ...extra,
  ],
})

const noun = (lemgram, gender, [sgIndef, sgDef, plIndef, plDef], paradigm = undefined) => ({
  lemgram,
  paradigm,
  baseform: sgIndef,
  partOfSpeech: 'nn',
  inherent: [gender],
  inflectionTable: [
    { msd: 'sg indef nom', writtenForm: sgIndef },
    { msd: 'sg def nom', writtenForm: sgDef },
    ...(plIndef ? [{ msd: 'pl indef nom', writtenForm: plIndef }] : []),
    ...(plDef ? [{ msd: 'pl def nom', writtenForm: plDef }] : []),
  ],
})

const ga = verb('gå..vb.1', 'vb', ['gå', 'går', 'gick', 'gått'])
const flyttaFram = verb('flytta_fram..vbm.1', 'vbm', ['flytta fram', 'flyttar fram', 'flyttade fram', 'flyttat fram'])
const flytta = verb('flytta..vb.1', 'vb', ['flytta', 'flyttar', 'flyttade', 'flyttat'])

describe('firstForms', () => {
  it('keeps the first variant of a form (bli, not bliva)', () => {
    const bli = {
      inflectionTable: [
        { msd: 'pres ind aktiv', writtenForm: 'blir' },
        { msd: 'pres ind aktiv', writtenForm: 'bliver' },
        { msd: 'inf aktiv', writtenForm: 'bli' },
        { msd: 'inf aktiv', writtenForm: 'bliva' },
      ],
    }
    expect(firstForms(bli)).toEqual({ 'pres ind aktiv': 'blir', 'inf aktiv': 'bli' })
  })

  it('prefers the "sig" variant of a reflexive verb (inrikta sig, not inrikta mig)', () => {
    const inrikta = {
      inflectionTable: ['mig', 'dig', 'sig', 'oss'].map((p) => ({ msd: 'inf aktiv', writtenForm: `inrikta ${p}` })),
    }
    expect(firstForms(inrikta)['inf aktiv']).toBe('inrikta sig')
  })
})

describe('extractVerbForms', () => {
  it('returns the four-form chain', () => {
    expect(extractVerbForms(ga)).toEqual({ infinitiv: 'gå', presens: 'går', preteritum: 'gick', supinum: 'gått' })
  })

  it('returns null when a form is missing', () => {
    const broken = { ...ga, inflectionTable: ga.inflectionTable.slice(0, 3) }
    expect(extractVerbForms(broken)).toBeNull()
  })
})

describe('extractNounForms', () => {
  it('returns singular and plural forms', () => {
    expect(extractNounForms(noun('dator..nn.1', 'u', ['dator', 'datorn', 'datorer', 'datorerna']))).toEqual({
      sgIndef: 'dator',
      sgDef: 'datorn',
      plIndef: 'datorer',
      plDef: 'datorerna',
    })
  })

  it('allows a missing plural (uncountable noun)', () => {
    const forms = extractNounForms(noun('sjukvård..nn.1', 'u', ['sjukvård', 'sjukvården']))
    expect(forms.plIndef).toBeNull()
  })
})

describe('parseVerbTerm', () => {
  it('strips "att" and tries the phrase longest-first', () => {
    expect(parseVerbTerm('att klara av provet/tentan/kursen')).toEqual({
      kind: 'infinitive',
      candidates: ['klara av provet', 'klara av', 'klara'],
    })
  })

  it('drops parenthesised notes', () => {
    expect(parseVerbTerm('att komma in (vid/på en högskola)').candidates[0]).toBe('komma in')
  })

  it('treats capitalised CV verbs as lower-cased preterites', () => {
    expect(parseVerbTerm('Flyttade fram')).toEqual({ kind: 'preterite', candidates: ['flyttade fram', 'flyttade'] })
  })

  it('normalises a reflexive pronoun to the dictionary "sig"', () => {
    expect(parseVerbTerm('Föreställde mig').candidates[0]).toBe('föreställde sig')
  })
})

describe('parseNounTerm', () => {
  it('parses a single-word noun with its article', () => {
    expect(parseNounTerm('ett arbete')).toEqual({ gender: 'ett', word: 'arbete' })
  })

  it('keeps hyphenated words', () => {
    expect(parseNounTerm('en mc-touring')).toEqual({ gender: 'en', word: 'mc-touring' })
  })

  it.each(['en valfri kurs', 'en man/make', 'en catering(-bransch)', 'föräldrar'])('rejects "%s"', (term) => {
    expect(parseNounTerm(term)).toBeNull()
  })
})

describe('selectVerbEntry', () => {
  it('accepts an unambiguous infinitive match', () => {
    const result = selectVerbEntry([ga, flyttaFram], 'gå', 'infinitive')
    expect(result.status).toBe('ok')
    expect(result.entry.lemgram).toBe('gå..vb.1')
  })

  it('matches a particle verb (vbm) by its full preterite phrase', () => {
    const result = selectVerbEntry([flytta, flyttaFram], 'flyttade fram', 'preterite')
    expect(result.forms.infinitiv).toBe('flytta fram')
  })

  it('does not let a single-word candidate match a vbm', () => {
    expect(selectVerbEntry([flyttaFram], 'flyttade', 'preterite').status).toBe('none')
  })

  it('reports ambiguity when senses inflect differently', () => {
    const vara1 = verb('vara..vb.1', 'vb', ['vara', 'är', 'var', 'varit'])
    const vara2 = verb('vara..vb.2', 'vb', ['vara', 'varar', 'varade', 'varat'])
    expect(selectVerbEntry([vara1, vara2], 'vara', 'infinitive').status).toBe('ambiguous')
    const resolved = selectVerbEntry([vara1, vara2], 'vara', 'infinitive', 'vara..vb.1')
    expect(resolved.forms.presens).toBe('är')
  })

  it('treats senses with identical forms as unambiguous', () => {
    const a = verb('ansvara..vb.1', 'vb', ['ansvara', 'ansvarar', 'ansvarade', 'ansvarat'])
    const b = { ...a, lemgram: 'ansvara..vb.2' }
    expect(selectVerbEntry([a, b], 'ansvara', 'infinitive').status).toBe('ok')
  })
})

describe('selectNounEntry', () => {
  const kodMass = noun('kod..nn.2', 'u', ['kod', 'koden'])
  const kodCount = noun('kod..nn.1', 'u', ['kod', 'koden', 'koder', 'koderna'])
  const fotbollSport = noun('fotboll..nn.1', 'u', ['fotboll', 'fotbollen'])
  const fotbollBall = noun('fotboll..nn.2', 'u', ['fotboll', 'fotbollen', 'fotbollar', 'fotbollarna'])

  it('rejects a gender mismatch', () => {
    const helg = noun('helg..nn.1', 'u', ['helg', 'helgen', 'helger', 'helgerna'])
    expect(selectNounEntry([helg], { word: 'helg', gender: 'ett' }, 'smaprat').status).toBe('none')
  })

  it('accepts either article for SALDO gender "v"', () => {
    const badminton = noun('badminton..nn.1', 'v', ['badminton', 'badmintonen'])
    expect(selectNounEntry([badminton], { word: 'badminton', gender: 'en' }, 'harrastukset').status).toBe('ok')
  })

  it('prefers the countable reading in ordinary categories', () => {
    const result = selectNounEntry([kodMass, kodCount], { word: 'kod', gender: 'en' }, 'ict')
    expect(result.forms.plIndef).toBe('koder')
  })

  it('prefers the uncountable reading for hobbies (the sport, not the ball)', () => {
    const result = selectNounEntry([fotbollSport, fotbollBall], { word: 'fotboll', gender: 'en' }, 'harrastukset')
    expect(result.forms.plIndef).toBeNull()
  })

  it('uses a sense override when two countable readings differ', () => {
    const provTest = noun('prov..nn.1', 'n', ['prov', 'provet', 'prov', 'proven'])
    const provSample = noun('prov..nn.2', 'n', ['prov', 'provet', 'prover', 'proverna'])
    const entries = [provTest, provSample]
    expect(selectNounEntry(entries, { word: 'prov', gender: 'ett' }, 'opiskelu').status).toBe('ambiguous')
    const resolved = selectNounEntry(entries, { word: 'prov', gender: 'ett' }, 'opiskelu', 'prov..nn.1')
    expect(resolved.forms.plIndef).toBe('prov')
  })

  it('returns none when nothing matches', () => {
    expect(selectNounEntry([], { word: 'tradenom', gender: 'en' }, 'ammatit').status).toBe('none')
  })
})

describe('shouldAskPlural', () => {
  const withPlural = { sgIndef: 'x', sgDef: 'xen', plIndef: 'xar', plDef: 'xarna' }

  it('asks the plural when it exists', () => {
    expect(shouldAskPlural(withPlural, 'ict')).toBe(true)
  })

  it('never asks it for field names', () => {
    expect(shouldAskPlural(withPlural, 'alat')).toBe(false)
  })

  it('does not ask it for uncountable nouns', () => {
    expect(shouldAskPlural({ ...withPlural, plIndef: null, plDef: null }, 'ict')).toBe(false)
  })
})

describe('extractNounForms with an article (SALDO gender "v")', () => {
  // Real SALDO poäng..nn.1: both definite singulars, the en-form first.
  const poang = {
    ...noun('poäng..nn.1', 'v', ['poäng', 'poängen', 'poäng', 'poängen'], 'nn_6v_borst'),
  }
  poang.inflectionTable.splice(2, 0, { msd: 'sg def nom', writtenForm: 'poänget' })

  it('keeps the first variant without an article', () => {
    expect(extractNounForms(poang).sgDef).toBe('poängen')
  })

  it('picks the definite singular matching the article', () => {
    expect(extractNounForms(poang, 'ett').sgDef).toBe('poänget')
    expect(extractNounForms(poang, 'en').sgDef).toBe('poängen')
  })

  it('does not touch single-gender entries', () => {
    const helg = noun('helg..nn.1', 'u', ['helg', 'helgen', 'helger', 'helgerna'])
    expect(extractNounForms(helg, 'ett').sgDef).toBe('helgen')
  })

  it('is used by selectNounEntry', () => {
    const result = selectNounEntry([poang], { word: 'poäng', gender: 'ett' }, 'opiskelu')
    expect(result.forms.sgDef).toBe('poänget')
  })
})

describe('headCandidates', () => {
  it('lists proper suffixes, longest first, at least 3 letters', () => {
    expect(headCandidates('elingenjör').map((c) => c.head)).toEqual([
      'lingenjör', 'ingenjör', 'ngenjör', 'genjör', 'enjör', 'njör', 'jör',
    ])
    expect(headCandidates('elingenjör')[1]).toEqual({ prefix: 'el', head: 'ingenjör' })
  })

  it('never returns the whole word', () => {
    expect(headCandidates('kurs').map((c) => c.head)).toEqual(['urs'])
  })
})

describe('saldoDeclension', () => {
  it('maps SALDO paradigms to school declensions 1-5', () => {
    expect(saldoDeclension('nn_1u_flicka')).toBe(1)
    expect(saldoDeclension('nn_2u_stol')).toBe(2)
    expect(saldoDeclension('nn_3u_karbid')).toBe(3)
    expect(saldoDeclension('nn_5n_dike')).toBe(4)
    expect(saldoDeclension('nn_6u_kikare')).toBe(5)
  })

  it('returns null for uncountable, irregular or missing paradigms', () => {
    expect(saldoDeclension('nn_0u_månsing')).toBeNull()
    expect(saldoDeclension('nn_ou_examen')).toBeNull()
    expect(saldoDeclension(undefined)).toBeNull()
  })
})

describe('pdfAgrees', () => {
  const ingenjor = noun('ingenjör..nn.1', 'u', ['ingenjör', 'ingenjören', 'ingenjörer', 'ingenjörerna'], 'nn_3u_kavaljer')
  const examen = noun('examen..nn.1', 'u', ['examen', 'examen', 'examina', 'examina'], 'nn_ou_examen')
  const forms = (e) => extractNounForms(e)

  it('compares the declension class', () => {
    expect(pdfAgrees({ declension: 3 }, ingenjor, forms(ingenjor))).toBe(true)
    expect(pdfAgrees({ declension: 2 }, ingenjor, forms(ingenjor))).toBe(false)
  })

  it('compares explicit head forms', () => {
    expect(pdfAgrees({ headForms: ['examen', 'examen', 'examina', 'examina'] }, examen, forms(examen))).toBe(true)
    expect(pdfAgrees({ headForms: ['examen', 'examen', 'examen', 'examen'] }, examen, forms(examen))).toBe(false)
  })

  it('compares the definite singular ending', () => {
    expect(pdfAgrees({ sgDefEnding: 'en' }, ingenjor, forms(ingenjor))).toBe(true)
    expect(pdfAgrees({ sgDefEnding: 'et' }, ingenjor, forms(ingenjor))).toBe(false)
  })

  it('never agrees without a PDF statement', () => {
    expect(pdfAgrees(undefined, ingenjor, forms(ingenjor))).toBe(false)
    expect(pdfAgrees({}, ingenjor, forms(ingenjor))).toBe(false)
  })
})

describe('prefixForms', () => {
  it('prefixes every form and keeps missing plurals null', () => {
    expect(prefixForms('el', { sgIndef: 'teknik', sgDef: 'tekniken', plIndef: null, plDef: null })).toEqual({
      sgIndef: 'elteknik', sgDef: 'eltekniken', plIndef: null, plDef: null,
    })
  })
})

describe('decideCompound', () => {
  const ingenjor = noun('ingenjör..nn.1', 'u', ['ingenjör', 'ingenjören', 'ingenjörer', 'ingenjörerna'], 'nn_3u_kavaljer')
  const ok = (entry) => ({ status: 'ok', entry, forms: extractNounForms(entry) })

  it('accepts a head whose class matches the PDF, with prefixed forms', () => {
    const result = decideCompound({ prefix: 'el', head: 'ingenjör' }, ok(ingenjor), { declension: 3 })
    expect(result.status).toBe('ok')
    expect(result.head).toBe('ingenjör')
    expect(result.entry.lemgram).toBe('ingenjör..nn.1')
    expect(result.forms).toEqual({
      sgIndef: 'elingenjör', sgDef: 'elingenjören', plIndef: 'elingenjörer', plDef: 'elingenjörerna',
    })
  })

  it('rejects a false head: robotik -> "tik" (a dog, class 2)', () => {
    const tik = noun('tik..nn.1', 'u', ['tik', 'tiken', 'tikar', 'tikarna'], 'nn_2u_stol')
    // No PDF statement for robotik at all -> never derived.
    expect(decideCompound({ prefix: 'robo', head: 'tik' }, ok(tik), undefined).status).toBe('rejected')
    // Even with a (hypothetical) PDF class, a mismatch is rejected.
    expect(decideCompound({ prefix: 'robo', head: 'tik' }, ok(tik), { declension: 3 }).status).toBe('rejected')
  })

  it('rejects mc-touring -> "ring" without a PDF statement', () => {
    const ring = noun('ring..nn.1', 'u', ['ring', 'ringen', 'ringar', 'ringarna'], 'nn_2u_sten')
    expect(decideCompound({ prefix: 'mc-tou', head: 'ring' }, ok(ring), undefined).status).toBe('rejected')
  })

  it('rejects an ambiguous head', () => {
    const ambiguous = { status: 'ambiguous', options: [] }
    expect(decideCompound({ prefix: 'x', head: 'yz' }, ambiguous, { declension: 3 }).status).toBe('rejected')
  })

  it('names the checking source', () => {
    expect(COMPOUND_CHECK).toBe('kananoja-2026')
  })
})

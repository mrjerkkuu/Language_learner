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

const noun = (lemgram, gender, [sgIndef, sgDef, plIndef, plDef]) => ({
  lemgram,
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

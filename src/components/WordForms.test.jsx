// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../test/renderWithProviders'
import { STORAGE_KEYS, srsDataKey } from '../lib/storageKeys'
import { ROUTES } from '../lib/routes'
import WordForms from './WordForms'

// The Swedish word forms are swapped for a tiny fixed set per test, so the
// picked word (and therefore every step) is predictable. Everything else
// (areas, categories, English) is the real content.
const mock = vi.hoisted(() => ({ svWordForms: null }))
vi.mock('../data/contentService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getContent: (lang) => {
      const content = actual.getContent(lang)
      return lang === 'sv' ? { ...content, wordForms: mock.svWordForms } : content
    },
  }
})

const base = { part: 1, category: 'smaprat', lemgram: 'x..vb.1' }
const ga = {
  ...base,
  id: 'wf-vb-v070',
  vocabIds: ['v070'],
  fi: 'mennä',
  forms: { infinitiv: 'gå', presens: 'går', preteritum: 'gick', supinum: 'gått' },
}
const helg = {
  ...base,
  id: 'wf-nn-v006',
  vocabId: 'v006',
  fi: 'viikonloppu',
  gender: 'en',
  forms: { sgIndef: 'helg', sgDef: 'helgen', plIndef: 'helger', plDef: 'helgerna' },
  askPlural: true,
}
const sjukvard = {
  ...base,
  id: 'wf-nn-v200',
  vocabId: 'v200',
  fi: 'sairaanhoito',
  gender: 'en',
  forms: { sgIndef: 'sjukvård', sgDef: 'sjukvården', plIndef: null, plDef: null },
  askPlural: false,
}

const withWords = ({ verbs = [], nouns = [] }) => ({ source: {}, verbs, nouns })

// Renders Muodot and, by default, starts a session from the size picker.
function renderForms({ start = true } = {}) {
  const utils = renderWithProviders(
    <Routes>
      <Route path={ROUTES.app} element={<div>Etusivu</div>} />
      <Route path={ROUTES.forms} element={<WordForms />} />
    </Routes>,
    { route: ROUTES.forms },
  )
  if (start) fireEvent.click(screen.getByRole('button', { name: /^Aloita/ }))
  return utils
}

beforeEach(() => {
  localStorage.clear()
})

// English has no word-form data (see K3), so the Muodot route must send the
// user back to the home page instead of crashing on a direct URL visit.
describe('WordForms route guard', () => {
  it('redirects to the home page when the language has no word forms', () => {
    localStorage.setItem(STORAGE_KEYS.language, JSON.stringify('en'))
    renderForms({ start: false })
    expect(screen.getByText('Etusivu')).toBeInTheDocument()
  })
})

describe('WordForms practice', () => {
  it('shows a verb with its first step (presens) and cue', () => {
    mock.svWordForms = withWords({ verbs: [ga] })
    renderForms()
    expect(screen.getByText('att gå')).toBeInTheDocument()
    expect(screen.getByText('mennä')).toBeInTheDocument()
    expect(screen.getByText('Preesens · 1/3')).toBeInTheDocument()
    expect(screen.getByText('jag ___ (nyt)')).toBeInTheDocument()
  })

  it('shows a noun bare, starting with the gender step', () => {
    mock.svWordForms = withWords({ nouns: [helg] })
    renderForms()
    expect(screen.getByText('helg')).toBeInTheDocument()
    expect(screen.getByText('en vai ett? · 1/4')).toBeInTheDocument()
  })

  it('walks a verb through presens, preteritum and supinum with feedback', async () => {
    mock.svWordForms = withWords({ verbs: [ga] })
    renderForms()

    // Step 1: correct.
    fireEvent.click(screen.getByRole('button', { name: 'går' }))
    expect(screen.getByText('Oikein!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))

    // Step 2: wrong -> shows the right answer.
    expect(screen.getByText('Imperfekti · 2/3')).toBeInTheDocument()
    expect(screen.getByText('jag ___ (eilen)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'gått' }))
    expect(screen.getByText('Oikea vastaus: gick')).toBeInTheDocument()
    // Options lock after the first answer.
    expect(screen.getByRole('button', { name: 'gick' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))

    // Step 3: correct.
    expect(screen.getByText('Perfekti · 3/3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'gått' }))
    expect(screen.getByText('Oikein!')).toBeInTheDocument()

    // Each form is its own spaced-repetition card (guest -> stored locally).
    await waitFor(() => {
      const cards = JSON.parse(localStorage.getItem(srsDataKey('sv')))
      expect(cards['wf-vb-v070:presens']).toMatchObject({ timesCorrect: 1, timesWrong: 0 })
      expect(cards['wf-vb-v070:preteritum']).toMatchObject({ timesCorrect: 0, timesWrong: 1 })
      expect(cards['wf-vb-v070:supinum']).toMatchObject({ timesCorrect: 1, timesWrong: 0 })
      expect(cards['wf-vb-v070']).toBeUndefined() // no word-level card
    })
  })

  it('asks only gender and definite form for a noun without a plural (2 steps)', () => {
    mock.svWordForms = withWords({ nouns: [sjukvard] })
    renderForms()

    fireEvent.click(screen.getByRole('button', { name: 'en' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))

    expect(screen.getByText('Määräinen muoto · 2/2')).toBeInTheDocument()
    expect(screen.getByText('den ___')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^sjukvård/ })).toHaveLength(2)
  })

  it('asks gender, definite, plural and definite plural for a countable noun (4 steps)', () => {
    mock.svWordForms = withWords({ nouns: [helg] })
    renderForms()

    const answer = (text) => {
      fireEvent.click(screen.getByRole('button', { name: text }))
      fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))
    }
    answer('en')
    expect(screen.getByText('Määräinen muoto · 2/4')).toBeInTheDocument()
    answer('helgen')
    expect(screen.getByText('Monikko · 3/4')).toBeInTheDocument()
    expect(screen.getByText('många ___')).toBeInTheDocument()
    answer('helger')
    expect(screen.getByText('Määräinen monikko · 4/4')).toBeInTheDocument()
    expect(screen.getByText('de ___')).toBeInTheDocument()
  })

  it('summarises the chain after the last step and moves on to the next word', () => {
    mock.svWordForms = withWords({ verbs: [ga] })
    renderForms()

    const answer = (text) => {
      fireEvent.click(screen.getByRole('button', { name: text }))
      fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))
    }
    answer('går')
    answer('gått') // wrong (preteritum is gick)
    answer('gått')

    expect(screen.getByText('2/3 oikein')).toBeInTheDocument()
    expect(screen.getByText('✓ går')).toBeInTheDocument()
    expect(screen.getByText('✗ gick')).toBeInTheDocument()
    expect(screen.getByText('valitsit: gått')).toBeInTheDocument()
    expect(screen.getByText('✓ gått')).toBeInTheDocument()
    // Header shows the word's place in the session (1 of 1).
    expect(screen.getByText('1/1')).toBeInTheDocument()
    // Last word of the session -> the button leads to the session result.
    expect(screen.getByRole('button', { name: 'Näytä tulos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Seuraava sana' })).not.toBeInTheDocument()
  })

  it('moves on to the other word of the session with "Seuraava sana"', () => {
    mock.svWordForms = withWords({ verbs: [ga], nouns: [sjukvard] })
    renderForms()

    const first = screen.queryByText('att gå') ? 'att gå' : 'sjukvård'
    const steps = first === 'att gå' ? ['går', 'gick', 'gått'] : ['en', 'sjukvården']
    for (const text of steps) {
      fireEvent.click(screen.getByRole('button', { name: text }))
      fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Seuraava sana' }))

    const second = first === 'att gå' ? 'sjukvård' : 'att gå'
    expect(screen.getByText(second, { selector: 'div' })).toBeInTheDocument()
  })

  it('picks the word set (Kaikki sanat / Verbit / Substantiivit) before the session', () => {
    mock.svWordForms = withWords({ verbs: [ga], nouns: [helg] })
    renderForms({ start: false })
    expect(screen.getByRole('button', { name: 'Kaikki sanat' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Valittavissa 2 – sessiossa kaikki 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Verbit' }))
    expect(screen.getByRole('button', { name: 'Verbit' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Valittavissa 1 – sessiossa kaikki 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aloita (1 sanaa)' }))
    expect(screen.getByText('att gå')).toBeInTheDocument()
    // The toggle is part of the setup, not shown during practice.
    expect(screen.queryByRole('button', { name: 'Substantiivit' })).not.toBeInTheDocument()
  })

  it('keeps the toggle visible when a kind has no words, so it can be switched back', () => {
    mock.svWordForms = withWords({ verbs: [ga] })
    renderForms({ start: false })
    fireEvent.click(screen.getByRole('button', { name: 'Substantiivit' }))
    expect(screen.getByText('Ei harjoituksia')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Verbit' }))
    expect(screen.getByText('Montako sanaa?')).toBeInTheDocument()
  })

  it('credits SALDO with a link from the data source (question, summary and empty views)', () => {
    const source = {
      name: 'SALDO, Språkbanken Text, Göteborgs universitet',
      license: 'CC BY 4.0',
      url: 'https://spraakbanken.gu.se/en/resources/saldom',
    }
    mock.svWordForms = { ...withWords({ nouns: [sjukvard] }), source }
    renderForms()

    const credit = () =>
      screen.getByRole('link', {
        name: 'Taivutusmuodot: SALDO, Språkbanken Text, Göteborgs universitet (CC BY 4.0)',
      })
    expect(credit()).toHaveAttribute('href', source.url)
    expect(credit()).toHaveAttribute('target', '_blank')
    expect(credit()).toHaveAttribute('rel', 'noreferrer')

    // Summary view.
    for (const text of ['en', 'sjukvården']) {
      fireEvent.click(screen.getByRole('button', { name: text }))
      fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))
    }
    expect(screen.getByText('2/2 oikein')).toBeInTheDocument()
    expect(credit()).toBeInTheDocument()

    // Session result view.
    fireEvent.click(screen.getByRole('button', { name: 'Näytä tulos' }))
    expect(credit()).toBeInTheDocument()
  })

  it('shows the empty state when there are no words', () => {
    mock.svWordForms = withWords({})
    renderForms({ start: false })
    expect(screen.getByText('Ei harjoituksia')).toBeInTheDocument()
  })
})

describe('WordForms sessions', () => {
  // Answers per word prompt: ga all right (3/3), helg partly (2/4), sjukvård all wrong (0/2).
  const ANSWERS = {
    'att gå': ['går', 'gick', 'gått'],
    helg: ['en', 'helgen', 'helgerna', 'helger'],
    sjukvård: ['ett', 'sjukvård'],
  }
  const currentPrompt = () =>
    Object.keys(ANSWERS).find((p) => screen.queryByText(p, { selector: 'div' }))

  // Answer every step of the word on screen, then press its summary button.
  function finishWord() {
    for (const text of ANSWERS[currentPrompt()]) {
      fireEvent.click(screen.getByRole('button', { name: text }))
      fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))
    }
  }

  it('opens on the size picker with 10 words preselected and does not start by itself', () => {
    mock.svWordForms = withWords({ verbs: [ga], nouns: [helg] })
    renderForms({ start: false })
    expect(screen.getByText('Montako sanaa?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/· 1\//)).not.toBeInTheDocument() // no step card yet
  })

  it('runs a session word by word and sums it up by words and answers', () => {
    mock.svWordForms = withWords({ verbs: [ga], nouns: [helg, sjukvard] })
    renderForms({ start: false })
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aloita (3 sanaa)' }))

    expect(screen.getByText('1/3')).toBeInTheDocument()
    finishWord()
    fireEvent.click(screen.getByRole('button', { name: 'Seuraava sana' }))
    expect(screen.getByText('2/3')).toBeInTheDocument()
    finishWord()
    fireEvent.click(screen.getByRole('button', { name: 'Seuraava sana' }))
    expect(screen.getByText('3/3')).toBeInTheDocument()
    finishWord()
    fireEvent.click(screen.getByRole('button', { name: 'Näytä tulos' }))

    expect(screen.getByText('Muodot — tulos')).toBeInTheDocument()
    expect(screen.getByText('Sanat kokonaan oikein')).toBeInTheDocument()
    expect(screen.getByText('Vastauksista oikein 5/9')).toBeInTheDocument()
    const tile = (label) => screen.getByText(label).previousSibling.textContent
    expect(tile('kokonaan oikein')).toBe('1')
    expect(tile('osittain')).toBe('1')
    expect(tile('kokonaan väärin')).toBe('1')

    // Every word with its steps-right count.
    const row = (prompt) => screen.getByText(prompt, { selector: 'span' }).closest('li').textContent
    expect(row('att gå')).toContain('3/3')
    expect(row('helg')).toContain('2/4')
    expect(row('sjukvård')).toContain('0/2')
    expect(screen.getByRole('link', { name: 'Valikkoon' })).toHaveAttribute('href', '/app')
  })

  it('remembers its own size, separate from Sanakortit, and starts over with "Uusi sessio"', () => {
    localStorage.setItem(STORAGE_KEYS.flashcardSessionSize, JSON.stringify(20))
    mock.svWordForms = withWords({ verbs: [ga] })
    renderForms({ start: false })
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: /^Aloita/ }))
    finishWord()
    fireEvent.click(screen.getByRole('button', { name: 'Näytä tulos' }))

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.formsSessionSize))).toBe(5)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.flashcardSessionSize))).toBe(20)

    fireEvent.click(screen.getByRole('button', { name: 'Uusi sessio' }))
    expect(screen.getByText('Montako sanaa?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true')
  })
})

// Muodot progress built up BEFORE sessions existed (same card ids, same
// storage) must be read, kept and extended — never reset or reinterpreted.
describe('WordForms sessions with earlier progress', () => {
  const HOUR_AGO = Date.now() - 60 * 60 * 1000
  const card = (over) => ({ weight: 2.5, lastSeen: HOUR_AGO, timesCorrect: 0, timesWrong: 0, learned: false, ...over })
  const newNoun = (i) => ({
    ...base,
    id: `wf-nn-x${i}`,
    vocabId: `x${i}`,
    fi: `sana ${i}`,
    gender: 'en',
    forms: { sgIndef: `ord${i}`, sgDef: `ord${i}en`, plIndef: null, plDef: null },
    askPlural: false,
  })

  // Let the progress provider finish loading from localStorage.
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

  it('picks a word with earlier progress into the session and extends its cards', async () => {
    const earlier = {
      'wf-vb-v070:presens': card({ weight: 1, timesCorrect: 4, learned: true }),
      'wf-vb-v070:preteritum': card({ weight: 8, timesCorrect: 1, timesWrong: 3 }),
      'wf-vb-v070:supinum': card({ weight: 2, timesCorrect: 2, timesWrong: 1 }),
      'wf-art-v006': card({ timesCorrect: 5 }), // legacy Muodot card
      v001: card({ timesCorrect: 7 }), // a Sanakortit card
    }
    localStorage.setItem(srsDataKey('sv'), JSON.stringify(earlier))

    // ga is the only practised word among six; a 5-word session's practised
    // quota (3) can only be filled by it, so it is always in the session.
    mock.svWordForms = withWords({ verbs: [ga], nouns: [1, 2, 3, 4, 5].map(newNoun) })
    renderForms({ start: false })
    await settle()
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aloita (5 sanaa)' }))

    // Play the whole session: ga right on every step, other words with the first option.
    for (let w = 0; w < 5; w++) {
      const isGa = Boolean(screen.queryByText('att gå', { selector: 'div' }))
      const answers = isGa ? ['går', 'gick', 'gått'] : null
      for (let i = 0; !screen.queryByRole('button', { name: /Seuraava sana|Näytä tulos/ }); i++) {
        const option = answers ? screen.getByRole('button', { name: answers[i] }) : screen.getAllByRole('button').find((b) => b.closest('.grid'))
        fireEvent.click(option)
        fireEvent.click(screen.getByRole('button', { name: 'Jatka' }))
      }
      fireEvent.click(screen.getByRole('button', { name: /Seuraava sana|Näytä tulos/ }))
    }
    expect(screen.getByText('att gå', { selector: 'span' }).closest('li').textContent).toContain('3/3')

    // Earlier counts are kept and extended by exactly one answer each.
    await waitFor(() => {
      const cards = JSON.parse(localStorage.getItem(srsDataKey('sv')))
      expect(cards['wf-vb-v070:presens']).toMatchObject({ timesCorrect: 5, timesWrong: 0 })
      expect(cards['wf-vb-v070:preteritum']).toMatchObject({ timesCorrect: 2, timesWrong: 3 })
      expect(cards['wf-vb-v070:supinum']).toMatchObject({ timesCorrect: 3, timesWrong: 1 })
      // The hard preteritum card came down from its earlier weight (not reset to default).
      expect(cards['wf-vb-v070:preteritum'].weight).toBeCloseTo(8 * 0.6)
      // Cards Muodot doesn't use are untouched.
      expect(cards['wf-art-v006']).toEqual(earlier['wf-art-v006'])
      expect(cards.v001).toEqual(earlier.v001)
    })
  })
})

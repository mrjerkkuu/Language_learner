// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
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

function renderForms() {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.app} element={<div>Etusivu</div>} />
      <Route path={ROUTES.forms} element={<WordForms />} />
    </Routes>,
    { route: ROUTES.forms },
  )
}

beforeEach(() => {
  localStorage.clear()
})

// English has no word-form data (see K3), so the Muodot route must send the
// user back to the home page instead of crashing on a direct URL visit.
describe('WordForms route guard', () => {
  it('redirects to the home page when the language has no word forms', () => {
    localStorage.setItem(STORAGE_KEYS.language, JSON.stringify('en'))
    renderForms()
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
    // The finished word counts in the header progress.
    expect(screen.getByText('1/1')).toBeInTheDocument()

    // Next word starts again from step 1 (only one word in the pool here).
    fireEvent.click(screen.getByRole('button', { name: 'Seuraava sana' }))
    expect(screen.getByText('Preesens · 1/3')).toBeInTheDocument()
    expect(screen.queryByText('Oikein!')).not.toBeInTheDocument()
  })

  it('does not repeat the word just practised when others are available', () => {
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

  it('narrows practice to verbs or nouns with the kind toggle', () => {
    mock.svWordForms = withWords({ verbs: [ga], nouns: [helg] })
    renderForms()
    expect(screen.getByRole('button', { name: 'Kaikki' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('0/2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Verbit' }))
    expect(screen.getByRole('button', { name: 'Verbit' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('att gå')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Substantiivit' }))
    expect(screen.getByText('helg')).toBeInTheDocument()
    expect(screen.getByText('en vai ett? · 1/4')).toBeInTheDocument()
  })

  it('keeps the toggle visible when a kind has no words, so it can be switched back', () => {
    mock.svWordForms = withWords({ verbs: [ga] })
    renderForms()
    fireEvent.click(screen.getByRole('button', { name: 'Substantiivit' }))
    expect(screen.getByText('Ei harjoituksia')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Verbit' }))
    expect(screen.getByText('att gå')).toBeInTheDocument()
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

    // Empty view.
    fireEvent.click(screen.getByRole('button', { name: 'Verbit' }))
    expect(screen.getByText('Ei harjoituksia')).toBeInTheDocument()
    expect(credit()).toBeInTheDocument()
  })

  it('shows the empty state when there are no words', () => {
    mock.svWordForms = withWords({})
    renderForms()
    expect(screen.getByText('Ei harjoituksia')).toBeInTheDocument()
  })
})

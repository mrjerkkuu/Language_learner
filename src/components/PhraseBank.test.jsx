// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { LanguageProvider } from '../context/LanguageContext'
import { FilterProvider, useFilter } from '../context/FilterContext'
import { ProgressProvider } from '../context/ProgressContext'
import { ActivityProvider } from '../context/ActivityContext'
import { renderWithProviders } from '../test/renderWithProviders'
import PhraseBank from './PhraseBank'
import { getContent } from '../data/contentService'

// -----------------------------------------------------------------------------
// PhraseBank: unlike FilterBar, the topic row is always shown (even under
// "Kaikki") — see E1 in claude/tulevat-muutokset.md. Since PhraseBank never
// changes `part` itself (only Home's FilterBar does), we pre-select a part via
// a small test-only setter that shares PhraseBank's own FilterProvider
// instance (renderWithProviders can't inject an extra sibling into its
// provider tree, so we rebuild it here).
// -----------------------------------------------------------------------------

const sv = getContent('sv')
const kysymyssanatLabel = sv.CATEGORIES.find((c) => c.id === 'kysymyssanat').label
// Derived from real data (not hardcoded) so this stays correct if a
// category's part assignment changes, e.g. during a PARTS restructuring.
const kysymyssanatPart = sv.phrases.find((p) => p.category === 'kysymyssanat').part

function PartSetter({ part }) {
  const { setPart } = useFilter()
  return (
    <button type="button" onClick={() => setPart(part)}>
      set-part-{part}
    </button>
  )
}

function renderPhraseBankAtPart(part) {
  render(
    <AuthProvider>
      <LanguageProvider>
        <ProgressProvider>
          <ActivityProvider>
            <MemoryRouter>
              <FilterProvider>
                <PartSetter part={part} />
                <PhraseBank />
              </FilterProvider>
            </MemoryRouter>
          </ActivityProvider>
        </ProgressProvider>
      </LanguageProvider>
    </AuthProvider>,
  )
  fireEvent.click(screen.getByText(`set-part-${part}`))
}

describe('PhraseBank', () => {
  it('shows topic chips even when part is "all" (default)', () => {
    renderWithProviders(<PhraseBank />)
    expect(screen.getByText(kysymyssanatLabel)).toBeInTheDocument()
  })

  it('shows the phrase-bank topics that occur under the selected part', () => {
    renderPhraseBankAtPart(kysymyssanatPart)
    expect(screen.getByText(kysymyssanatLabel)).toBeInTheDocument()
  })

  it('filters the list by typing in the search box', () => {
    renderWithProviders(<PhraseBank />)
    const first = sv.phrases[0]
    const other = sv.phrases.find((p) => p.id !== first.id)
    expect(screen.getByText(other.term)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Hae fraasia'), { target: { value: first.term } })

    expect(screen.getByText(first.term)).toBeInTheDocument()
    expect(screen.queryByText(other.term)).toBeNull()
  })

  it('shows a clear-search action when nothing matches, and clearing it restores the list', () => {
    renderWithProviders(<PhraseBank />)
    fireEvent.change(screen.getByLabelText('Hae fraasia'), { target: { value: 'epatodennakoinenhakusana' } })
    expect(screen.getByText(/Ei hakutuloksia/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Tyhjennä haku'))

    expect(screen.getByLabelText('Hae fraasia')).toHaveValue('')
    expect(screen.getByText(sv.phrases[0].term)).toBeInTheDocument()
  })
})

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { LanguageProvider } from '../context/LanguageContext'
import { FilterProvider, useFilter } from '../context/FilterContext'
import { renderWithProviders } from '../test/renderWithProviders'
import PhraseBank from './PhraseBank'
import { getContent } from '../data/contentService'

// -----------------------------------------------------------------------------
// PhraseBank: same "Kaikki hides the topic row" rule as FilterBar, scoped to
// phrases.json's own categories. Since PhraseBank never changes `part` itself
// (only Home's FilterBar does), we pre-select a part via a small test-only
// setter that shares PhraseBank's own FilterProvider instance (renderWithProviders
// can't inject an extra sibling into its provider tree, so we rebuild it here).
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
        <MemoryRouter>
          <FilterProvider>
            <PartSetter part={part} />
            <PhraseBank />
          </FilterProvider>
        </MemoryRouter>
      </LanguageProvider>
    </AuthProvider>,
  )
  fireEvent.click(screen.getByText(`set-part-${part}`))
}

describe('PhraseBank', () => {
  it('renders no topic chip when part is "all" (default)', () => {
    renderWithProviders(<PhraseBank />)
    expect(screen.queryByText(kysymyssanatLabel)).toBeNull()
  })

  it('shows the phrase-bank topics that occur under the selected part', () => {
    renderPhraseBankAtPart(kysymyssanatPart)
    expect(screen.getByText(kysymyssanatLabel)).toBeInTheDocument()
  })
})

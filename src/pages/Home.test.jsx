// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import Home from './Home'
import { getContent } from '../data/contentService'

// -----------------------------------------------------------------------------
// Home (integration): language switch + area filter wiring
// -----------------------------------------------------------------------------
// This is the test that actually proves the plumbing works end to end:
// LanguageContext -> content -> per-module counter, and FilterContext -> counter.
// Counts are derived from the real data (not hard-coded numbers) so the test
// stays honest if the content files change.
// -----------------------------------------------------------------------------

// Read the count shown inside the "Sanakortit" module row specifically
// (several rows show a number, so we scope the query to this row).
function sanakortitCount() {
  const row = screen.getByText('Sanakortit').closest('a')
  // The row renders: <dot><title>  <count><chevron>. The count is the only
  // element with the small-text class holding a number.
  return Number(within(row).getByText(/^\d+$/).textContent)
}

describe('Home (integration)', () => {
  it('shows the Swedish vocabulary count by default', () => {
    const expected = getContent('sv').vocabulary.length
    renderWithProviders(<Home />)
    expect(sanakortitCount()).toBe(expected)
  })

  it('switches the counts when the language pill changes to English', () => {
    const svCount = getContent('sv').vocabulary.length
    const enCount = getContent('en').vocabulary.length
    renderWithProviders(<Home />)

    expect(sanakortitCount()).toBe(svCount)

    // Click the English language pill -> LanguageContext swaps the content set.
    fireEvent.click(screen.getByRole('button', { name: 'Englanti' }))
    expect(sanakortitCount()).toBe(enCount)
  })

  it('narrows the counts when a topic-area pill is selected', () => {
    const sv = getContent('sv')
    // "Min bransch" is area (part) 3 in the Swedish data.
    const area = sv.PARTS.find((p) => p.label === 'Min bransch')
    const inArea = sv.vocabulary.filter((v) => v.part === area.id).length

    renderWithProviders(<Home />)
    expect(sanakortitCount()).toBe(sv.vocabulary.length)

    // Selecting the area pill writes to FilterContext, which every module reads.
    fireEvent.click(screen.getByRole('button', { name: 'Min bransch' }))
    expect(sanakortitCount()).toBe(inArea)
  })
})

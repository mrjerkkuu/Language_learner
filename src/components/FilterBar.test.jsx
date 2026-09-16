// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import FilterBar from './FilterBar'
import { getContent } from '../data/contentService'

// -----------------------------------------------------------------------------
// FilterBar: the topic-chip row is hidden under "Kaikki" (part === 'all') and
// appears, narrowed to the selected area, once a specific area is chosen.
// Labels are read from the real sv content so the test stays honest if the
// category set changes.
// -----------------------------------------------------------------------------

const sv = getContent('sv')
const ictLabel = sv.CATEGORIES.find((c) => c.id === 'ict').label
const perheLabel = sv.CATEGORIES.find((c) => c.id === 'perhe').label
const omaAlaLabel = sv.PARTS.find((p) => p.id === 3).label // part 3, where ICT lives

describe('FilterBar', () => {
  it('renders no topic chip when "Kaikki" (part=all) is selected by default', () => {
    renderWithProviders(<FilterBar />)
    expect(screen.queryByText(ictLabel)).toBeNull()
    expect(screen.queryByText(perheLabel)).toBeNull()
  })

  it('shows only the topics that occur under the selected area', () => {
    renderWithProviders(<FilterBar />)
    fireEvent.click(screen.getByRole('button', { name: omaAlaLabel }))
    expect(screen.getByText(ictLabel)).toBeInTheDocument()
    // "Perhe" occurs under a different part, not part 3.
    expect(screen.queryByText(perheLabel)).toBeNull()
  })

  it('hides the row again, and clears the selection, when switching back to Kaikki', () => {
    renderWithProviders(<FilterBar />)
    fireEvent.click(screen.getByRole('button', { name: omaAlaLabel }))
    fireEvent.click(screen.getByRole('button', { name: ictLabel }))
    expect(screen.getByRole('button', { name: ictLabel })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Kaikki' }))
    expect(screen.queryByText(ictLabel)).toBeNull()

    // No ghost selection: re-selecting the same area shows ICT as unselected again.
    fireEvent.click(screen.getByRole('button', { name: omaAlaLabel }))
    expect(screen.getByRole('button', { name: ictLabel })).toHaveAttribute('aria-pressed', 'false')
  })
})

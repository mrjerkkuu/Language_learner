// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import Flashcard from './Flashcard'
import { STORAGE_KEYS } from '../lib/storageKeys'

// Every session starts from the size picker; "Aloita" builds it. Default 20.
function renderSession(size = 20) {
  const utils = renderWithProviders(<Flashcard />)
  if (size !== 20) fireEvent.click(screen.getByRole('button', { name: String(size) }))
  fireEvent.click(screen.getByRole('button', { name: /^Aloita/ }))
  return utils
}

beforeEach(() => localStorage.clear())

describe('Flashcard (integration)', () => {
  it('shows the Swedish side first and flips on tap', () => {
    const { container } = renderSession()

    // Front is showing: the "Svenska" label + the flip hint.
    expect(screen.getByText('Svenska')).toBeInTheDocument()
    expect(screen.getByText('Napauta kääntääksesi')).toBeInTheDocument()

    const inner = container.querySelector('.flip-inner')
    expect(inner.classList.contains('is-flipped')).toBe(false)

    // Tap the card (pointer down + up with no movement) -> flips.
    const card = container.querySelector('.cursor-grab')
    fireEvent.pointerDown(card, { clientX: 100 })
    fireEvent.pointerUp(card, { clientX: 100 })
    expect(inner.classList.contains('is-flipped')).toBe(true)
  })

  it('records a correct answer to spaced-repetition storage when "Oikein" is clicked', () => {
    renderSession()

    fireEvent.click(screen.getByRole('button', { name: 'Oikein' }))

    // The wiring: button -> recordResult -> per-language localStorage.
    const raw = localStorage.getItem('srs-data-v1:sv')
    expect(raw).toBeTruthy()
    const data = JSON.parse(raw)
    const entries = Object.values(data)
    expect(entries).toHaveLength(1)
    expect(entries[0].timesCorrect).toBe(1)
    expect(entries[0].timesWrong).toBe(0)
    expect(entries[0].weight).toBeLessThan(2.5) // correct answer lowers the weight
  })

  it('records a wrong answer (weight goes up) when "Väärin" is clicked', () => {
    renderSession()
    fireEvent.click(screen.getByRole('button', { name: 'Väärin' }))
    const entries = Object.values(JSON.parse(localStorage.getItem('srs-data-v1:sv')))
    expect(entries[0].timesWrong).toBe(1)
    expect(entries[0].weight).toBeGreaterThan(2.5)
  })

  it('shows the next card front-first after answering (no flipped answer leaks)', () => {
    const { container } = renderSession()

    // Flip the current card to its answer side...
    const card = container.querySelector('.cursor-grab')
    fireEvent.pointerDown(card, { clientX: 100 })
    fireEvent.pointerUp(card, { clientX: 100 })
    expect(container.querySelector('.flip-inner').classList.contains('is-flipped')).toBe(true)

    // ...then answer. The next card must be showing its FRONT (not flipped),
    // otherwise the next answer would be visible during the rotation.
    fireEvent.click(screen.getByRole('button', { name: 'Oikein' }))
    expect(container.querySelector('.flip-inner').classList.contains('is-flipped')).toBe(false)
  })

  it('ends the session after 20 cards and shows the result screen', () => {
    const { container } = renderSession()

    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Oikein' }))
    }

    expect(screen.getByText('Sanakortit — tulos')).toBeInTheDocument()
    expect(container.querySelectorAll('ul li')).toHaveLength(20)
  })

  it('lists every word from the session on the result screen with its translation and result', () => {
    const { container } = renderSession()

    fireEvent.click(screen.getByRole('button', { name: 'Väärin' }))
    for (let i = 0; i < 19; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Oikein' }))
    }

    const rows = container.querySelectorAll('ul li')
    expect(rows).toHaveLength(20)
    // Rows are in answer order: the first answer was "Väärin", the rest "Oikein".
    expect(rows[0].textContent).toContain('väärin')
    expect(rows[0].textContent).toContain(' — ') // term — translation
    expect(rows[1].textContent).toContain('oikein')
  })

  it('links back to the app menu from the result screen', () => {
    renderSession()

    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Oikein' }))
    }

    const link = screen.getByRole('link', { name: 'Valikkoon' })
    expect(link).toHaveAttribute('href', '/app')
  })

  it('shows the size picker first and does not start a session by itself', () => {
    renderWithProviders(<Flashcard />)
    expect(screen.getByText('Montako korttia?')).toBeInTheDocument()
    expect(screen.queryByText('Napauta kääntääksesi')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Oikein' })).not.toBeInTheDocument()
    // First visit: 20 is preselected.
    expect(screen.getByRole('button', { name: '20' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('runs a session of the chosen size and remembers it for next time', () => {
    const { container, unmount } = renderSession(5)
    expect(screen.getByText('1/5')).toBeInTheDocument()
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Oikein' }))
    expect(screen.getByText('Sanakortit — tulos')).toBeInTheDocument()
    expect(container.querySelectorAll('ul li')).toHaveLength(5)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.flashcardSessionSize))).toBe(5)
    unmount()

    // Next visit: the picker again, with 5 preselected.
    renderWithProviders(<Flashcard />)
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '20' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not remember a size that was only tapped, not started', () => {
    renderWithProviders(<Flashcard />)
    fireEvent.click(screen.getByRole('button', { name: '10' }))
    expect(localStorage.getItem(STORAGE_KEYS.flashcardSessionSize)).toBeNull()
  })

  it('starts over from the size picker with "Uusi sessio"', () => {
    renderSession(5)
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Oikein' }))

    fireEvent.click(screen.getByRole('button', { name: 'Uusi sessio' }))
    expect(screen.getByText('Montako korttia?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Aloita (5 korttia)' }))
    expect(screen.getByText('1/5')).toBeInTheDocument()
  })
})

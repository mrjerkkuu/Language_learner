// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import Flashcard from './Flashcard'

describe('Flashcard (integration)', () => {
  it('shows the Swedish side first and flips on tap', () => {
    const { container } = renderWithProviders(<Flashcard />)

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
    renderWithProviders(<Flashcard />)

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
    renderWithProviders(<Flashcard />)
    fireEvent.click(screen.getByRole('button', { name: 'Väärin' }))
    const entries = Object.values(JSON.parse(localStorage.getItem('srs-data-v1:sv')))
    expect(entries[0].timesWrong).toBe(1)
    expect(entries[0].weight).toBeGreaterThan(2.5)
  })

  it('shows the next card front-first after answering (no flipped answer leaks)', () => {
    const { container } = renderWithProviders(<Flashcard />)

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
})

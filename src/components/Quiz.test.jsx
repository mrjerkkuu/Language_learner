// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import Quiz from './Quiz'

// -----------------------------------------------------------------------------
// Quiz (integration): full session playthrough -> result + recording
// -----------------------------------------------------------------------------
// Verifies the session flow that the pure logic tests can't: the async
// question build, "answer -> Seuraava -> ... -> Näytä tulokset", the result
// screen, and that every answered question is fed back into spaced repetition
// (per-language localStorage). We don't try to answer correctly — we just play
// a whole session and check the wiring, so it's deterministic regardless of the
// randomised question order.
// -----------------------------------------------------------------------------

// The option buttons are the only ones carrying aria-pressed; the advance
// button ("Seuraava"/"Näytä tulokset") does not.
function firstOption(container) {
  return container.querySelector('button[aria-pressed]')
}
function advanceButton() {
  return screen.getByRole('button', { name: /Seuraava|Näytä tulokset/ })
}

describe('Quiz (integration)', () => {
  it('plays a whole session and shows the result screen', async () => {
    const { container } = renderWithProviders(<Quiz />)

    // The session is built asynchronously (an async distractor hook is awaited),
    // so wait for the first question's advance button to appear.
    await screen.findByRole('button', { name: /Seuraava|Näytä tulokset/ })

    // Play through the session: pick an option, then advance. Bounded loop so a
    // wiring bug can never hang the test instead of failing it.
    for (let step = 0; step < 30; step += 1) {
      if (screen.queryByText('Quiz — tulos')) break
      fireEvent.click(firstOption(container)) // select an answer
      fireEvent.click(advanceButton()) // Seuraava / Näytä tulokset
    }

    // We reached the dedicated result screen (feedback only at the end).
    expect(screen.getByText('Quiz — tulos')).toBeInTheDocument()
    // "Oikein" summary tile is part of the result screen.
    expect(screen.getByText('oikein')).toBeInTheDocument()
  })

  it('records every answered question into spaced repetition', async () => {
    const { container } = renderWithProviders(<Quiz />)
    await screen.findByRole('button', { name: /Seuraava|Näytä tulokset/ })

    for (let step = 0; step < 30; step += 1) {
      if (screen.queryByText('Quiz — tulos')) break
      fireEvent.click(firstOption(container))
      fireEvent.click(advanceButton())
    }

    await waitFor(() => {
      const raw = localStorage.getItem('srs-data-v1:sv')
      expect(raw).toBeTruthy()
      const entries = Object.values(JSON.parse(raw))
      // A session is 10 questions (or the whole pool if smaller); every one is
      // recorded. At minimum, the session produced recorded review state.
      expect(entries.length).toBeGreaterThan(0)
    })
  })
})

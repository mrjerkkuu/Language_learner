// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../test/renderWithProviders'
import { STORAGE_KEYS } from '../lib/storageKeys'
import { ROUTES } from '../lib/routes'
import WordForms from './WordForms'

// English has no word-form data (see K3), so the Muodot route must send the
// user back to the home page instead of crashing on a direct URL visit.
describe('WordForms route guard', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEYS.language, JSON.stringify('en'))
  })

  it('redirects to the home page when the language has no word forms', () => {
    renderWithProviders(
      <Routes>
        <Route path={ROUTES.app} element={<div>Etusivu</div>} />
        <Route path={ROUTES.forms} element={<WordForms />} />
      </Routes>,
      { route: ROUTES.forms },
    )
    expect(screen.getByText('Etusivu')).toBeInTheDocument()
  })
})

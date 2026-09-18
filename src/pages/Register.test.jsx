// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import * as authService from '../services/authService'
import Register from './Register'

// Mock only the network-touching functions — mapAuthError stays real so the
// error copy asserted below matches production wording. These are UI tests:
// the HTTP layer itself is covered by apiClient.test.js/authService.test.js.
vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, register: vi.fn(), login: vi.fn(), logout: vi.fn(), me: vi.fn() }
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  mockNavigate.mockReset()
  vi.mocked(authService.me).mockResolvedValue(null)
})

const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Luo tili' }))

describe('Register (integration)', () => {
  it('shows all three field errors on empty submit', () => {
    renderWithProviders(<Register />)
    submit()
    expect(screen.getByText('Anna näyttönimi.')).toBeInTheDocument()
    expect(screen.getByText('Anna sähköpostiosoite.')).toBeInTheDocument()
    expect(screen.getByText('Anna salasana.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('blocks a too-short password with a client-side message', () => {
    renderWithProviders(<Register />)
    fill('Näyttönimi', 'Jeremia')
    fill('Sähköposti', 'jeremia@example.fi')
    fill('Salasana', 'lyhyt') // < 8 chars
    submit()
    expect(screen.getByText(/vähintään 8 merkkiä/i)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows the "email already taken" server error', async () => {
    vi.mocked(authService.register).mockResolvedValue({
      ok: false,
      code: 'email_taken',
      message: 'Tällä sähköpostilla on jo tili. Kirjaudu sisään.',
    })
    renderWithProviders(<Register />)
    fill('Näyttönimi', 'Jeremia')
    fill('Sähköposti', 'taken@example.com')
    fill('Salasana', 'salasana123')
    submit()
    expect(
      await screen.findByText('Tällä sähköpostilla on jo tili. Kirjaudu sisään.'),
    ).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows a pending-approval message instead of navigating on a successful registration', async () => {
    vi.mocked(authService.register).mockResolvedValue({ ok: true, pending: true })
    renderWithProviders(<Register />)
    fill('Näyttönimi', 'Jeremia')
    fill('Sähköposti', 'uusi@example.fi')
    fill('Salasana', 'salasana123')
    submit()
    expect(await screen.findByText(/pääsysi odottaa hyväksyntää/i)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

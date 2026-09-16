// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import * as authService from '../services/authService'
import Login from './Login'

// Mock only the network-touching functions — mapAuthError stays real so the
// error copy asserted below matches production wording. These are UI tests:
// the HTTP layer itself is covered by apiClient.test.js/authService.test.js.
vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, register: vi.fn(), login: vi.fn(), logout: vi.fn(), me: vi.fn() }
})

// Capture navigation without a full <Routes> tree. Partial-mock so Link,
// MemoryRouter etc. keep working; only useNavigate is replaced.
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
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Kirjaudu' }))

describe('Login (integration)', () => {
  it('shows field errors on empty submit and does not navigate', () => {
    renderWithProviders(<Login />)
    submit()
    expect(screen.getByText('Anna sähköpostiosoite.')).toBeInTheDocument()
    expect(screen.getByText('Anna salasana.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows the server error message on bad credentials', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      ok: false,
      code: 'bad_credentials',
      message: 'Sähköposti tai salasana ei täsmää.',
    })
    renderWithProviders(<Login />)
    fill('Sähköposti', 'jeremia@example.fi')
    fill('Salasana', 'wrongpass')
    submit()
    expect(await screen.findByText('Sähköposti tai salasana ei täsmää.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates to /app on a successful login', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      ok: true,
      user: { id: '1', email: 'jeremia@example.fi', displayName: 'Jeremia' },
    })
    renderWithProviders(<Login />)
    fill('Sähköposti', 'jeremia@example.fi')
    fill('Salasana', 'salasana123')
    submit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true }))
  })

  it('returns to the original deep-linked destination after login, via state.from', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      ok: true,
      user: { id: '1', email: 'jeremia@example.fi', displayName: 'Jeremia' },
    })
    // Simulate arriving at /login the way ProtectedRoute sends someone: with
    // state.from set to the page they originally tried to reach.
    renderWithProviders(<Login />, {
      route: '/login',
      state: { from: { pathname: '/app/flashcards' } },
    })
    fill('Sähköposti', 'jeremia@example.fi')
    fill('Salasana', 'salasana123')
    submit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app/flashcards', { replace: true }))
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import Login from './Login'

// Capture navigation without a full <Routes> tree. Partial-mock so Link,
// MemoryRouter etc. keep working; only useNavigate is replaced.
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => mockNavigate.mockReset())

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
    renderWithProviders(<Login />)
    fill('Sähköposti', 'jeremia@example.fi')
    fill('Salasana', 'wrongpass') // the stub treats this as invalid creds
    submit()
    expect(await screen.findByText('Sähköposti tai salasana ei täsmää.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates on a successful login', async () => {
    renderWithProviders(<Login />)
    fill('Sähköposti', 'jeremia@example.fi')
    fill('Salasana', 'salasana123')
    submit()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })
})

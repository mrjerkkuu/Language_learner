// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function LoginProbe() {
  const location = useLocation()
  return (
    <div>
      <p>LOGIN_PAGE</p>
      <p data-testid="from-path">{location.state?.from?.pathname ?? ''}</p>
    </div>
  )
}

function renderProtected(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<p>PROTECTED_CONTENT</p>} />
          <Route path="/app/flashcards" element={<p>PROTECTED_CONTENT</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading state while status is loading, not the protected content', () => {
    useAuth.mockReturnValue({ status: 'loading', isDemo: false })
    renderProtected('/app')

    expect(screen.getByText('Ladataan…')).toBeInTheDocument()
    expect(screen.queryByText('PROTECTED_CONTENT')).not.toBeInTheDocument()
  })

  it('redirects to /login when not authed and not in demo mode', () => {
    useAuth.mockReturnValue({ status: 'anon', isDemo: false })
    renderProtected('/app')

    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument()
    expect(screen.queryByText('PROTECTED_CONTENT')).not.toBeInTheDocument()
  })

  it('preserves the original path in state.from so Login can return there afterwards', () => {
    useAuth.mockReturnValue({ status: 'anon', isDemo: false })
    renderProtected('/app/flashcards')

    expect(screen.getByTestId('from-path')).toHaveTextContent('/app/flashcards')
  })

  it('renders the protected content via <Outlet/> when authed', () => {
    useAuth.mockReturnValue({ status: 'authed', isDemo: false })
    renderProtected('/app')

    expect(screen.getByText('PROTECTED_CONTENT')).toBeInTheDocument()
  })

  it('renders the protected content when isDemo is true, even without being authed', () => {
    useAuth.mockReturnValue({ status: 'anon', isDemo: true })
    renderProtected('/app')

    expect(screen.getByText('PROTECTED_CONTENT')).toBeInTheDocument()
  })
})

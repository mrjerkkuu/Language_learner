// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import * as authService from '../services/authService'

vi.mock('../services/authService')

function Probe() {
  const { user, status, isDemo, login, register, logout, startDemo } = useAuth()
  const [lastLogoutResult, setLastLogoutResult] = useState(null)
  const [lastRegisterResult, setLastRegisterResult] = useState(null)

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
      <span data-testid="demo">{String(isDemo)}</span>
      <span data-testid="logout-result">{lastLogoutResult ? JSON.stringify(lastLogoutResult) : ''}</span>
      <span data-testid="register-result">{lastRegisterResult ? JSON.stringify(lastRegisterResult) : ''}</span>
      <button onClick={() => login({ email: 'b@c.fi', password: 'x' })}>login</button>
      <button onClick={async () => setLastRegisterResult(await register({ displayName: 'B', email: 'b@c.fi', password: 'x' }))}>
        register
      </button>
      <button onClick={async () => setLastLogoutResult(await logout())}>logout</button>
      <button onClick={() => startDemo()}>demo</button>
    </div>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('AuthContext', () => {
  it('settles to authed when me() resolves a user on mount', async () => {
    authService.me.mockResolvedValue({ id: '1', email: 'a@b.fi', displayName: 'A' })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(screen.getByTestId('status')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authed'))
    expect(screen.getByTestId('user')).toHaveTextContent('a@b.fi')
  })

  it('settles to anon when me() resolves null on mount', async () => {
    authService.me.mockResolvedValue(null)
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'))
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('settles to anon (not stuck on loading) when me() rejects with a network error', async () => {
    authService.me.mockRejectedValue(new Error('network down'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'))
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('login() updates user/status synchronously on success (no follow-up me() call needed)', async () => {
    authService.me.mockResolvedValue(null)
    authService.login.mockResolvedValue({ ok: true, user: { id: '2', email: 'b@c.fi', displayName: 'B' } })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'))

    await act(async () => {
      screen.getByText('login').click()
    })

    expect(screen.getByTestId('status')).toHaveTextContent('authed')
    expect(screen.getByTestId('user')).toHaveTextContent('b@c.fi')
    // Only the one me() call on mount — login doesn't trigger a follow-up.
    expect(authService.me).toHaveBeenCalledTimes(1)
  })

  it('register() does NOT log the visitor in on success — status stays anon (pending admin approval)', async () => {
    authService.me.mockResolvedValue(null)
    authService.register.mockResolvedValue({ ok: true, pending: true })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'))

    await act(async () => {
      screen.getByText('register').click()
    })

    expect(screen.getByTestId('status')).toHaveTextContent('anon')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(screen.getByTestId('register-result')).toHaveTextContent('"pending":true')
  })

  it('logout() always clears local state and returns the error, even when the server call fails', async () => {
    authService.me.mockResolvedValue({ id: '1', email: 'a@b.fi', displayName: 'A' })
    authService.logout.mockResolvedValue({ ok: false, code: 'internal_error' })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authed'))

    await act(async () => {
      screen.getByText('logout').click()
    })

    expect(screen.getByTestId('status')).toHaveTextContent('anon')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(screen.getByTestId('logout-result')).toHaveTextContent('"ok":false')
    expect(screen.getByTestId('logout-result')).toHaveTextContent('internal_error')
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('logout() resets isDemo back to false', async () => {
    authService.me.mockResolvedValue(null)
    authService.logout.mockResolvedValue({ ok: true })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'))

    await act(async () => {
      screen.getByText('demo').click()
    })
    expect(screen.getByTestId('demo')).toHaveTextContent('true')

    await act(async () => {
      screen.getByText('logout').click()
    })
    expect(screen.getByTestId('demo')).toHaveTextContent('false')
  })
})

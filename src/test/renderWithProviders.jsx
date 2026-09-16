import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { LanguageProvider } from '../context/LanguageContext'
import { FilterProvider } from '../context/FilterContext'

// Render a component with the same providers the real app uses (auth,
// language, router, filter). Used by component/integration tests.
//
// AuthProvider calls authService.me() on mount. Tests that don't care about
// auth state don't need to mock it: authService.me() attempts a real fetch()
// to a relative URL, which fails in the test environment and is caught by
// AuthContext's own error handling, settling to status:'anon'. Tests that DO
// care about auth (Login/Register, anything using useAuth()) should
// vi.mock('../services/authService') and set authService.me's resolved value
// explicitly instead of relying on that fallback.
export function renderWithProviders(ui, { route = '/', state } = {}) {
  const initialEntry = state ? { pathname: route, state } : route
  return render(
    <AuthProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <FilterProvider>{ui}</FilterProvider>
        </MemoryRouter>
      </LanguageProvider>
    </AuthProvider>,
  )
}

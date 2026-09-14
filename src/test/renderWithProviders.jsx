import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../context/LanguageContext'
import { FilterProvider } from '../context/FilterContext'

// Render a component with the same providers the real app uses (language,
// router, filter). Used by component/integration tests.
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[route]}>
        <FilterProvider>{ui}</FilterProvider>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

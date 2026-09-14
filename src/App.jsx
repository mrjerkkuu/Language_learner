import { FilterProvider } from './context/FilterContext'
import FilterBar from './components/FilterBar'

// Root component of the application.
//
// The whole app is wrapped in <FilterProvider> so the part+category filter is
// shared everywhere. Routing (HashRouter) and the four modules are still added
// in later commits; for now we render the FilterBar to verify the shared
// filter state works end to end.
export default function App() {
  return (
    <FilterProvider>
      <div className="app-safe min-h-screen">
        <header className="bg-brand-700 px-4 py-4 text-white">
          <h1 className="text-lg font-semibold">Työelämän ruotsi</h1>
        </header>
        <main className="mx-auto max-w-xl p-4">
          <FilterBar />
        </main>
      </div>
    </FilterProvider>
  )
}

import { FilterProvider } from './context/FilterContext'
import FilterBar from './components/FilterBar'
import Flashcard from './components/Flashcard'

// Root component of the application.
//
// Still an interim shell: routing (HashRouter) and the Home menu are added in a
// later commit. For now we render the FilterBar + the Flashcards module so the
// swipe/flip + spaced-repetition flow can be verified end to end.
export default function App() {
  return (
    <FilterProvider>
      <div className="app-safe min-h-screen">
        <header className="bg-brand-700 px-4 py-4 text-white">
          <h1 className="text-lg font-semibold">Työelämän ruotsi</h1>
        </header>
        <main className="mx-auto max-w-xl space-y-4 p-4">
          <FilterBar />
          <Flashcard />
        </main>
      </div>
    </FilterProvider>
  )
}

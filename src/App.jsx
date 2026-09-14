import { FilterProvider } from './context/FilterContext'
import FilterBar from './components/FilterBar'
import Flashcard from './components/Flashcard'
import PhraseBank from './components/PhraseBank'
import WritingPractice from './components/WritingPractice'
import Quiz from './components/Quiz'

// Root component of the application.
//
// Still an interim shell: routing (HashRouter) and the Home menu are added in a
// later commit. For now modules are stacked below the FilterBar so each one can
// be verified as it is built.
export default function App() {
  return (
    <FilterProvider>
      <div className="app-safe min-h-screen">
        <header className="bg-brand-700 px-4 py-4 text-white">
          <h1 className="text-lg font-semibold">Työelämän ruotsi</h1>
        </header>
        <main className="mx-auto max-w-xl space-y-6 p-4">
          <FilterBar />

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Flashcards</h2>
            <Flashcard />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Fraasipankki</h2>
            <PhraseBank />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Kirjoitusharjoitus</h2>
            <WritingPractice />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Quiz</h2>
            <Quiz />
          </section>
        </main>
      </div>
    </FilterProvider>
  )
}

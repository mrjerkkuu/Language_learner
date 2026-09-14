import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import Layout from './components/Layout'
import FilterSummary from './components/FilterSummary'
import Home from './pages/Home'
import Flashcard from './components/Flashcard'
import PhraseBank from './components/PhraseBank'
import WritingPractice from './components/WritingPractice'
import Quiz from './components/Quiz'

// -----------------------------------------------------------------------------
// App root
// -----------------------------------------------------------------------------
// - FilterProvider wraps everything so the part+category filter is shared across
//   all pages and survives navigation.
// - HashRouter is used deliberately for GitHub Pages: routes live in the URL
//   hash (e.g. /Language_learner/#/quiz), so refreshing or deep-linking a module
//   never hits the server for a path it doesn't have, and no 404.html fallback
//   is needed. Trade-off: URLs contain a '#'. For a single-user study app that's
//   a fine, robust choice.
// -----------------------------------------------------------------------------

// Small helper so each module route shares the same frame: back header + the
// read-only filter summary + the module itself.
function ModulePage({ title, children }) {
  return (
    <Layout title={title} back>
      <div className="space-y-4">
        <FilterSummary />
        {children}
      </div>
    </Layout>
  )
}

export default function App() {
  return (
    <FilterProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout title="Työelämän ruotsi"><Home /></Layout>} />
          <Route path="/flashcards" element={<ModulePage title="Flashcards"><Flashcard /></ModulePage>} />
          <Route path="/phrases" element={<ModulePage title="Fraasipankki"><PhraseBank /></ModulePage>} />
          <Route path="/writing" element={<ModulePage title="Kirjoitusharjoitus"><WritingPractice /></ModulePage>} />
          <Route path="/quiz" element={<ModulePage title="Quiz"><Quiz /></ModulePage>} />
          {/* Unknown paths fall back to the home page. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </FilterProvider>
  )
}

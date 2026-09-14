import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import Home from './pages/Home'
import Flashcard from './components/Flashcard'
import PhraseBank from './components/PhraseBank'
import WritingPractice from './components/WritingPractice'
import Quiz from './components/Quiz'

// -----------------------------------------------------------------------------
// App root
// -----------------------------------------------------------------------------
// - FilterProvider wraps everything so the area+topic filter is shared across
//   all pages and survives navigation.
// - HashRouter is used deliberately for GitHub Pages: routes live in the URL
//   hash (e.g. /Language_learner/#/quiz), so refreshing or deep-linking a module
//   never asks the server for a path it doesn't have — no 404.html workaround.
// - Each page renders its own <Layout> (with the right header/counter/progress),
//   so routes here are just the page components.
// -----------------------------------------------------------------------------

export default function App() {
  return (
    <FilterProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flashcards" element={<Flashcard />} />
          <Route path="/phrases" element={<PhraseBank />} />
          <Route path="/writing" element={<WritingPractice />} />
          <Route path="/quiz" element={<Quiz />} />
          {/* Unknown paths fall back to the home page. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </FilterProvider>
  )
}

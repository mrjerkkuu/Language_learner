import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { FilterProvider } from './context/FilterContext'
import Home from './pages/Home'
import Flashcard from './components/Flashcard'
import PhraseBank from './components/PhraseBank'
import WritingPractice from './components/WritingPractice'
import Quiz from './components/Quiz'
import WordForms from './components/WordForms'

// -----------------------------------------------------------------------------
// App root
// -----------------------------------------------------------------------------
// - LanguageProvider holds the selected target language + its content.
// - FilterProvider is keyed by language, so switching language remounts the
//   routed subtree and cleanly re-initialises per-language state (spaced
//   repetition, the area+topic filter).
// - HashRouter keeps routing in the URL hash — GitHub Pages friendly (no
//   server-side rewrites / 404.html needed).
// -----------------------------------------------------------------------------

// The routed part of the app, remounted per language via key.
function LanguageScopedRoutes() {
  const { lang } = useLanguage()
  return (
    <FilterProvider key={lang}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flashcards" element={<Flashcard />} />
        <Route path="/phrases" element={<PhraseBank />} />
        <Route path="/writing" element={<WritingPractice />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/forms" element={<WordForms />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </FilterProvider>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <LanguageScopedRoutes />
      </HashRouter>
    </LanguageProvider>
  )
}

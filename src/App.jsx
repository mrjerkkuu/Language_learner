import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { FilterProvider } from './context/FilterContext'
import { ROUTES } from './lib/routes'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
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
        <Route path={ROUTES.home} element={<Home />} />

        {/* Auth screens (Vaihe 3 frontti). Built now with an isolated
            authService STUB — no real backend yet, so auth is NOT enforced and
            these are simply reachable by URL. When the backend lands, the
            landing becomes "/", the practice area moves behind a guard + demo
            flag, and routing switches to BrowserRouter. */}
        <Route path={ROUTES.welcome} element={<Landing />} />
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.register} element={<Register />} />

        <Route path={ROUTES.flashcards} element={<Flashcard />} />
        <Route path={ROUTES.phrases} element={<PhraseBank />} />
        <Route path={ROUTES.writing} element={<WritingPractice />} />
        <Route path={ROUTES.quiz} element={<Quiz />} />
        <Route path={ROUTES.forms} element={<WordForms />} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
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

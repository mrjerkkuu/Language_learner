import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { FilterProvider } from './context/FilterContext'
import { ProgressProvider } from './context/ProgressContext'
import { ActivityProvider } from './context/ActivityContext'
import { ROUTES } from './lib/routes'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Privacy from './pages/Privacy'
import Flashcard from './components/Flashcard'
import PhraseBank from './components/PhraseBank'
import WritingPractice from './components/WritingPractice'
import Quiz from './components/Quiz'
import WordForms from './components/WordForms'

// -----------------------------------------------------------------------------
// App root
// -----------------------------------------------------------------------------
// - AuthProvider holds the session (GET /api/auth/me on mount) for the whole
//   app, including the public screens (Landing/Login/Register need it too).
// - LanguageProvider holds the selected target language + its content.
// - ProgressProvider/ActivityProvider hold the spaced-repetition map and the
//   activity summary ONCE for the whole app (see context/ProgressContext.jsx
//   and context/ActivityContext.jsx) — every component that used to call
//   useSpacedRepetition()/useActivityLog() directly now shares this single
//   loaded copy instead of each fetching its own.
// - FilterProvider is keyed by language, so switching language remounts the
//   routed subtree and cleanly re-initialises per-language state (the
//   area+topic filter; ProgressProvider reloads on language change too, via
//   its own [lang] effect, without needing a remount).
// - BrowserRouter (not Hash) since the backend now serves the SPA from a
//   single origin — see vite.config.js's `base` and dev proxy.
// -----------------------------------------------------------------------------

// The routed part of the app, remounted per language via key.
function LanguageScopedRoutes() {
  const { lang } = useLanguage()
  return (
    <FilterProvider key={lang}>
      <Routes>
        <Route path={ROUTES.landing} element={<Landing />} />
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.register} element={<Register />} />
        <Route path={ROUTES.privacy} element={<Privacy />} />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.app} element={<Home />} />
          <Route path={ROUTES.flashcards} element={<Flashcard />} />
          <Route path={ROUTES.phrases} element={<PhraseBank />} />
          <Route path={ROUTES.writing} element={<WritingPractice />} />
          <Route path={ROUTES.quiz} element={<Quiz />} />
          <Route path={ROUTES.forms} element={<WordForms />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.landing} replace />} />
      </Routes>
    </FilterProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ProgressProvider>
          <ActivityProvider>
            <BrowserRouter>
              <LanguageScopedRoutes />
            </BrowserRouter>
          </ActivityProvider>
        </ProgressProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

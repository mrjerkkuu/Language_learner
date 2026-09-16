// -----------------------------------------------------------------------------
// routes — the single registry of the app's route paths.
// -----------------------------------------------------------------------------
// Centralising paths here means routing changes (moving screens, adding a
// guard) touch this one file plus the router, instead of every <Link>/<Route>.
// -----------------------------------------------------------------------------

export const ROUTES = {
  // Public
  landing: '/',
  login: '/login',
  register: '/register',

  // Practice area — behind ProtectedRoute (authed or demo)
  app: '/app',
  flashcards: '/app/flashcards',
  phrases: '/app/phrases',
  writing: '/app/writing',
  quiz: '/app/quiz',
  forms: '/app/forms',
}

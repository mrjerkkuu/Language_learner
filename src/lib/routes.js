// -----------------------------------------------------------------------------
// routes — the single registry of the app's route paths.
// -----------------------------------------------------------------------------
// Centralising paths here means the upcoming Vaihe 3 routing change (auth guard,
// moving the practice area under /app/*, switching HashRouter -> BrowserRouter)
// touches this one file plus the router, instead of every <Link>/<Route>.
//
// Today these match the current flat HashRouter layout. When the backend lands,
// the practice routes move under /app (see vaihe-3-suunnitelma.md); update the
// values here and every consumer follows automatically.
// -----------------------------------------------------------------------------

export const ROUTES = {
  // Practice area (today at the root; becomes /app/* in Vaihe 3)
  home: '/',
  flashcards: '/flashcards',
  phrases: '/phrases',
  writing: '/writing',
  quiz: '/quiz',
  forms: '/forms',

  // Public auth screens
  welcome: '/welcome',
  login: '/login',
  register: '/register',
}

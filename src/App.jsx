// Root component of the application.
//
// THIS IS A TEMPORARY SHELL (scaffold stage): it only shows a title so the
// project compiles and runs. Routing (HashRouter) and the modules are added in
// the following commits, in the implementation order from the project plan.
export default function App() {
  return (
    <div className="app-safe min-h-screen">
      <header className="bg-brand-700 text-white px-4 py-4">
        <h1 className="text-lg font-semibold">Työelämän ruotsi</h1>
      </header>
      <main className="p-4">
        <p className="text-slate-600">
          Projektin runko pystyssä. Moduulit lisätään seuraavaksi.
        </p>
      </main>
    </div>
  )
}

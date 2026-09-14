// Sovelluksen juurikomponentti.
//
// TÄMÄ ON VÄLIAIKAINEN RUNKO (scaffold-vaihe): näyttää vain otsikon, jotta
// projekti kääntyy ja käynnistyy. Reititys (HashRouter) ja moduulit lisätään
// seuraavissa committeissa suunnitelman toteutusjärjestyksen mukaan.
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

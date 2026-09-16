# Arkkitehtuuriarvio & jatkokehityssuunnitelma — Language Learner

Tarkistettu 14.9.2026 koko `src/`-puu (~3000 riviä). Kysymys: onko repo
jatkokehitettävä, vai kasautuuko siihen "solmuja joita korvataan solmuilla"?

## Verdict

**Kyllä, repo on rakennettu jatkokehitettäväksi.** Selkeästi kerrostettu, I/O eristetty
palvelukerroksiin. **Löydetyt kiristykset L1–L5 on nyt tehty** (commit `da4fbe6`), joten runko on
valmis backendille.

---

## Miksi se on jatkokehitettävä (vahvuudet)

| Piirre | Miksi tärkeä |
|--------|--------------|
| **Selkeä kerrostus** | `lib/` (puhdas logiikka) → `hooks/` (tila) → `services/`+`context/` (I/O & jako) → UI |
| **Logiikka eristetty & testattu** | SR, streak, distractorit, validointi puhtaina funktioina (71 testiä) |
| **I/O eristetty** | `contentService`, `aiService`, `authService`, **`progressStore`** — ainoat "ulospäin puhuvat" paikat |
| **Versioidut tallennusavaimet** | migraatio mahdollinen; nyt koottu `storageKeys.js`:ään |
| **Johdonmukaiset moduulit** | sama kaava kaikissa: filter/language + SR/activity + Layout/FilterTag/EmptyState |
| **Monikielisyys valmiina** | uusi kieli = kansio + rivi |

---

## Löydökset & tila (kaikki hoidettu)

| # | Vakavuus | Ongelma | Ratkaisu | Tila |
|---|----------|---------|----------|------|
| L1 | 🔴 Korkea | `Quiz.jsx` paluu `<a href="#/">` — rikkoutuisi BrowserRouterissa | Vaihdettu `<Link to={ROUTES.home}>` | ✅ Tehty |
| L2 | 🟠 Keski | SR/activity-hookit sitoivat localStoragen suoraan | Uusi `services/progressStore.js`; hookit kutsuvat sitä → backend-kytkentä ei muuta hookkeja | ✅ Tehty |
| L3 | 🟠 Keski | SR-logiikan kahdentumisriski (front vs. server) | `srLogic.js` merkitty jaetuksi lähteeksi + varmistettu riippuvuudettomaksi | ✅ Merkitty (fyysinen siirto server-scaffoldissa) |
| L4 | 🟡 Matala | tallennusavaimet hajallaan | Uusi `lib/storageKeys.js`; kaikki kytketty | ✅ Tehty |
| L5 | 🟡 Matala | reittipolut merkkijonoina; `Layout` back kovakoodattu `/` | Uusi `lib/routes.js`; `Layout` sai `backTo`-propin | ✅ Tehty |
| L6 | 🟡 Matala | README ei heijasta auth-näyttöjä/testejä | Päivitä backendin yhteydessä | ⏳ Myöhemmin |
| L7 | ⚪ Valinnainen | ei tyypitystä (PropTypes/TS) | Harkinta jos projekti kasvaa isoksi | ⏳ Valinnainen |

---

## Jatkosuunnitelma

### ✅ Vaihe A — pienet kiristykset (TEHTY, commit `da4fbe6`)
L1 (Quiz-Link), L4 (`storageKeys.js`), L5 (`routes.js` + `Layout` `backTo`). Lisäksi L2 (`progressStore`)
ja L3 (jaettu-merkintä) tehtiin samalla.

### Vaihe B — backendin valmistelu (Vaihe 3:n alussa)
- `progressStore` saa **server-toteutuksen** samojen metodinimien taakse (kirjautuneena palvelin, muuten localStorage).
- `srLogic.js` siirretään fyysisesti jaettuun polkuun kun `server/` scaffoldataan; palvelin importtaa saman moduulin.

### Vaihe C — backend (kuten `vaihe-3-suunnitelma.md`)
`server/`-scaffold, auth-reitit, `authService`-stubin rungot → oikeat `fetch`-kutsut, `AuthContext` +
`ProtectedRoute`, reititys landing→`/` + harjoittelu→`/app/*` + `BrowserRouter` (nyt yhden `routes.js`-muutoksen takana).

---

## Konventiot jatkoon
- **Uusi ulkomaailman yhteys → oma service** (ei suoraa `fetch`/`localStorage` komponentista).
- **Uusi logiikka → `lib/` puhtaana + testi.**
- **Uusi kieli → `data/<id>/` + rivi `languages.js`:ään.**
- **Tallennusavaimet ja reitit vakioista** (`storageKeys.js` / `routes.js`).
- **Versioi tallennusmuoto** (`-vN`) kun rakenne muuttuu.
- **Testit ennen mergeä** (CI estää punaiset).
- **Kommentit + commitit englanniksi, UI + sisältö suomeksi/kohdekielellä.**

## Testauksen tila
- **71 testiä** (puhdas logiikka + data + komponentit + auth-lomakkeet + `progressStore`).
- Vaihe B/C: `progressStore` server-toteutuksen testit; `AuthContext`/`ProtectedRoute` (RTL); Fastify `inject` (auth, guard 401, "vain oma data").

---

## Yhteenveto
Perusta on hyvä ja jatkokehitettävä, ja **L1–L5 on nyt hoidettu** — uusi massa asettuu siistiin
runkoon. Seuraavaksi backend (Vaihe 3), jonka kytkentäpisteet on jo eristetty (`authService`,
`progressStore`, `routes.js`).

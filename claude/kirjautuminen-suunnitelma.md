# Kirjautumissivun suunnitelma — Language Learner (Vaihe 3, frontti)

Täydentää `vaihe-3-suunnitelma.md`:tä (backend/API/reititys).

## Päätökset

| Aihe | Päätös |
|------|--------|
| Kirjautumisen pakollisuus | **Pakollinen tallennukseen + demotila** — harjoittelu vaatii tilin, mutta landingissa "Kokeile" avaa demon joka ei tallenna pysyvästi |
| Rekisteröintikentät | **Näyttönimi + sähköposti + salasana** |
| Nyt suunniteltavat näytöt | **Landing (`/`) + Login (`/login`) + Rekisteröinti (`/register`)** |
| Salasanan palautus | Myöhempää vaihetta (ei nyt) |

---

## ✅ Toteutustilanne (tehty jo tänään, frontti stubilla)

Näytöt, lomakelogiikka ja **eristetty `authService`-kerros stubina** on jo rakennettu ja mergattu
(samalla mallilla kuin `aiService`). **Näin backend kytketään huomenna yhdestä paikasta ilman että
näyttöjä tarvitsee muuttaa.**

**Valmiit tiedostot:**
- `src/lib/validation.js` — puhtaat validoinnit (email, salasana ≥8, näyttönimi) + `validateForm`.
- `src/services/authService.js` — **STUB**: `register/login/logout/me` + `mapAuthError`. Palauttaa simuloidun tuloksen (latenssi 450 ms). Testisyötteet: salasana `wrongpass` → väärät tunnukset, sähköposti `taken@example.com` → varattu.
- `src/components/FormField.jsx`, `src/components/PasswordInput.jsx` (näytä/piilota), `src/components/AuthShell.jsx`.
- `src/pages/Landing.jsx`, `src/pages/Login.jsx`, `src/pages/Register.jsx`.
- Reitit `/welcome`, `/login`, `/register` (nykyiseen HashRouteriin; **ei riko** olemassa olevaa).
- Testit: `validation.test.js` (12) + `Login.test.jsx` (3) + `Register.test.jsx` (4). Koko suite **68 vihreää**.

**EI vielä tehty (odottaa backendiä):** oikeat `/api`-kutsut, `AuthContext` + `GET /me`,
`ProtectedRoute`-esto, pakotettu kirjautuminen + demotila, `BrowserRouter` + `base '/'`,
Home siirto `/app`:iin, demo→tili -tuonti. Nämä alla kohdissa 5–6 ja 9.

**Huomiselle (backendin kytkentä yhdestä paikasta):**
1. Korvaa `authService`-funktioiden rungot oikeilla `fetch('/api/auth/...', { credentials:'include' })`-kutsuilla — paluumuodot pidetään samoina (`{ ok, user } | { ok:false, code, message }`), joten näytöt eivät muutu.
2. Lisää `AuthContext` (+`GET /me` latauksessa) ja `ProtectedRoute`.
3. Vaihda reititys: landing → `/`, harjoittelu → `/app/*` guardin taakse, `BrowserRouter`, `base '/'`.
4. Login/Register `navigate('/')` → `navigate('/app')` (tai aiottu osoite); rekisteröinnissä demo→tili -tuonti.

---

## 1. Sivukartta & reititys (tavoite backendin jälkeen)

```
Julkinen:  /            Landing — [Kirjaudu] [Rekisteröidy] [Kokeile]
           /login       Kirjautumislomake
           /register    Rekisteröintilomake
Suojattu:  /app                 Harjoittele-valikko (nykyinen Home)
           /app/flashcards|phrases|writing|quiz|forms
```

> **Nyt (ennen backendiä):** reitit ovat `/welcome`, `/login`, `/register`, ja harjoittelu on yhä `/`:ssä
> HashRouterilla. Vaihto yllä olevaan tehdään backendin yhteydessä.

**Ohjauslogiikka (`<ProtectedRoute>`, tulossa):**

| Tilanne | Toiminta |
|---------|----------|
| Kirjautunut | Pääsee `/app/*` (tallennus palvelimelle) |
| Demotila päällä | Pääsee `/app/*`, demo-varastoon + demobanneri |
| Ei kumpaakaan → `/app/*` | Uudelleenohjaus `/login` (aiottu osoite talteen) |
| Kirjautunut → `/login`/`/register` | Uudelleenohjaus `/app` |
| Auth-tila latautuu (`GET /me`) | Lyhyt latausnäyttö |

---

## 2. Näytöt

### 2.1 Landing `/`
Kicker "Kieliharjoittelu" + iso otsikko + hyötylause; **Rekisteröidy** (accent), **Kirjaudu** (ring),
tekstilinkki **Kokeile ilman tiliä →**; teemakytkin oikeassa yläkulmassa.

### 2.2 Login `/login`
Takaisin, sähköposti, salasana (näytä/piilota), Kirjaudu, linkki rekisteröintiin. (Myöhemmin: salasanan palautus.)

### 2.3 Rekisteröinti `/register`
Takaisin, näyttönimi, sähköposti, salasana (vihje ≥8), Luo tili, linkki kirjautumiseen.

### 2.4 Demotila (tila, ei reitti)
Landingin "Kokeile" → `/app`; pysyvä banneri *"Demotila — edistymistä ei tallenneta. Rekisteröidy pitääksesi sen."* + [Rekisteröidy].

---

## 3. Kentät, validointi & tilat

| Kenttä | Säännöt (client) | `autocomplete` | `type`/`inputmode` |
|--------|------------------|----------------|--------------------|
| Näyttönimi | pakollinen, 1–40 | `nickname` | text |
| Sähköposti | pakollinen, perusmuotocheck | login: `username` / rekisteröinti: `email` | `type=email` |
| Salasana (login) | pakollinen | `current-password` | `type=password` |
| Salasana (rekisteröinti) | pakollinen, ≥8 | `new-password` | `type=password` |

Tilat: **idle** (nappi käytettävissä) → **submitting** (nappi "Kirjaudutaan…/Luodaan tiliä…", kentät lukossa) →
**virhe** (palvelinviesti lomakkeen yläreunaan, kenttävirheet kenttien alle `aria-describedby`) / **onnistuminen** (ohjaus).

Salasanan näyttö/piilotus: yksi kenttä + silmä-nappi (ei erillistä vahvistuskenttää).

---

## 4. Virheviestit (`mapAuthError`, suomeksi)

| Tilanne | code | Viesti |
|---------|------|--------|
| Väärä sähköposti/salasana | `bad_credentials` | "Sähköposti tai salasana ei täsmää." |
| Sähköposti jo käytössä | `email_taken` | "Tällä sähköpostilla on jo tili. Kirjaudu sisään." |
| Liian monta yritystä | `rate_limited` | "Liian monta yritystä. Odota hetki ja yritä uudelleen." |
| Yhteys-/palvelinvirhe | `network` | "Yhteysvirhe. Tarkista yhteys ja yritä uudelleen." |

> Login ei kerro erikseen onko sähköposti olemassa (sama viesti väärästä sähköpostista ja salasanasta).

---

## 5. Auth-tilan hallinta frontissa (tulossa backendin kanssa)

`AuthContext`: `{ user, status:'loading'|'authed'|'anon', isDemo, login, register, logout, startDemo, endDemo }`.
Latauksessa `GET /api/auth/me`. `<ProtectedRoute>` päästää läpi jos `authed || isDemo`, muuten `/login` (`state.from`).

## 6. Demo → tili -siirtymä (tallennusratkaisu)

| Vaihtoehto | Plussat | Miinukset | Suositus |
|------------|---------|-----------|----------|
| **A. `sessionStorage`** | Aidosti ei-pysyvä, selvä ero tiliin | Vahinkopäivitys hukkaa demon | ✅ Suositus |
| B. `localStorage` + tuonti | Säilyy päivityksen yli | Hämärtää "tallentamattoman" rajaa | Jos armollisempi demo halutaan |

Rekisteröinnissä/kirjautumisessa demossa: lue varasto → `POST /api/progress/import` → tyhjennä → `endDemo()`.
Toteutus `demoStore`-palveluna (varaston vaihto A↔B = yksi tiedosto).

---

## 7. Tietoturva frontin puolella
- **Ei tokenia JS:ssä/localStoragessa** — istunto httpOnly-evästeessä (XSS ei pääse käsiksi).
- `fetch(..., { credentials:'include' })`; **CSRF-token** otsakkeeseen tilaa muuttaviin POSTeihin.
- Salasana ei lokiin; salasanatila tyhjennetään lähetyksen jälkeen. Autocomplete-attribuutit oikein.
- **Huom (auth-toteutus, Vaihe 2):** varmista ettei `apiClient.js` koskaan
  logita pyynnön bodya kokonaisuudessaan virhetilanteissa (esim.
  `console.error(requestBody)`) — salasana saattaisi päätyä lokiin sitä kautta.

## 8. Saavutettavuus & mobiili (2a)
`<label>` + `aria-describedby`; fokus ensimmäiseen virhekenttään; kosketuskohteet ≥44px; toimii tummassa/vaaleassa;
`type=email` + `enterkeyhint`. Silmä-nappi `aria-label` + `aria-pressed`.

---

## 9. Uudet tiedostot (frontti)

Valmiit (kohta ✅ yllä). Backendin kanssa lisättävät:
`src/context/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`, `src/services/demoStore.js`,
+ reititys `/app/*` + `BrowserRouter` + `base '/'`, Home → `/app`.

**Näyttö → API -kytkennät (huomenna):**

| Näyttö/toiminto | API-kutsu |
|-----------------|-----------|
| Rekisteröinti | `POST /api/auth/register { displayName, email, password }` |
| Kirjautuminen | `POST /api/auth/login { email, password }` |
| Auth-tila latauksessa | `GET /api/auth/me` |
| Uloskirjaus | `POST /api/auth/logout` |
| Demo → tili | `POST /api/progress/import` |

---

## 10. Testit
Tehty: `validation.test.js`, `Login.test.jsx`, `Register.test.jsx` (validointivirheet, palvelinvirheet stubista, onnistunut → navigointi).
Backendin kanssa: `AuthContext`/`ProtectedRoute` (RTL) + Fastify `inject` (register/login/logout/me, guard 401, "vain oma data").

## 11. Avoimet / myöhemmät
Salasanan palautus + sähköpostivarmennus; "muista minut"; mahdollinen Google-kirjautuminen.

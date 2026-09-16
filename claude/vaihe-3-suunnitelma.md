# Vaihe 3 — Backend, kirjautuminen & tietokanta (SUUNNITELMA)

**Ei toteutettu vielä — tämä on suunnitelma.** Repo: https://github.com/mrjerkkuu/Language_learner

> **⚡ Frontti pohjustettu etukäteen (14.9.):** kirjautumis-/rekisteröinti-/landing-näytöt,
> lomakelogiikka ja **eristetty `authService`-kerros STUBINA** on jo rakennettu ja testattu
> (samalla mallilla kuin `aiService`). **Backend kytketään siksi yhdestä paikasta** — korvataan
> `src/services/authService.js`-funktioiden rungot oikeilla `fetch('/api/auth/...')`-kutsuilla,
> paluumuodot pysyvät samoina, eikä näyttöjä tarvitse muuttaa. Yksityiskohdat + "huomiselle"-lista:
> **`kirjautuminen-suunnitelma.md`**.

## Päätetty stack
- **Backend:** Node.js + **Fastify**
- **Auth:** sessiot, **httpOnly-eväste** (salattu eväste, `@fastify/secure-session`)
- **Tietokanta:** relaatiokanta + **Prisma ORM** — aloita **SQLite**, vaihto **PostgreSQL**iin yhdellä asetuksella myöhemmin
- **Hosting:** läppäri tarjoilee sekä buildatun frontin että API:n **samasta originista**, julki **Tailscale Funnelilla** (ilmainen, pysyvä HTTPS `*.ts.net`)

## Arkkitehtuuri (sama origin)
- **Monorepo:** nykyinen frontti (`src/`) + uusi `server/` (Fastify).
- **Tuotanto:** Fastify tarjoilee `dist/`-staattiset tiedostot **ja** `/api/*`-reitit samasta portista → sama origin → eväste-auth toimii ilman CORSia. SPA-fallback (kaikki ei-`/api`-reitit → `index.html`).
- **Kehitys:** Vite-devserveri (5173) + Fastify (3000); Vite proxyttaa `/api` → 3000 (`server.proxy` `vite.config.js`:ssä). Käytännössä sama origin myös devissä.
- **Reititys:** vaihda `HashRouter` → `BrowserRouter`, `base` `'/Language_learner/'` → `'/'` (oma serveri hoitaa deep linkit SPA-fallbackilla). GitHub Pages jää pois sovelluskäytöstä (voi jättää staattiseksi demoksi tai poistaa workflow'n).

## Tietokantamalli (Prisma)
Sisältö (sanat/fraasit yms.) pysyy toistaiseksi frontin JSON:issa; kanta tallentaa vain **käyttäjät + edistymisen + aktiivisuuden**.

```
User      { id, email (unique), passwordHash, displayName?, createdAt }
Progress  { id, userId → User, language, itemId, weight, lastSeen,
            timesCorrect, timesWrong, learned, updatedAt
            @@unique([userId, language, itemId]) }
Activity  { id, userId → User, date (YYYY-MM-DD), count
            @@unique([userId, date]) }
```
- Sessioita ei tarvitse omaan tauluun (salattu eväste on tilaton). Jos halutaan uloskirjaus-per-sessio palvelinpuolelta, lisätään `Session`-taulu myöhemmin.

## API-reitit (Fastify, kaikki `/api`)
**Auth**
- `POST /api/auth/register` `{ email, password, displayName? }` → luo käyttäjä (argon2-hash), aloita sessio
- `POST /api/auth/login` `{ email, password }` → varmista, aloita sessio
- `POST /api/auth/logout` → tyhjennä sessio
- `GET  /api/auth/me` → nykyinen käyttäjä tai 401

**Edistyminen & aktiivisuus** (vaativat kirjautumisen)
- `GET  /api/progress?language=sv` → käyttäjän edistymiskartta kielelle
- `POST /api/progress/record` `{ language, itemId, correct }` → palvelin laskee painon (SR-logiikka siirtyy tänne = yksi totuuden lähde) ja tallentaa; kasvattaa myös päivän aktiivisuutta
- `POST /api/progress/record-batch` `{ language, results:[{itemId,correct}] }` → quiz-session kertakirjaus
- `GET  /api/activity/summary` → `{ today, weekCount, activeDaysThisWeek, currentStreak, bestStreak }`
- (valinnainen) `POST /api/progress/import` → kertaluontoinen localStorage-/demo-edistymisen tuonti ensimmäisellä kirjautumisella

## Kirjautumisen flow
1. Rekisteröinti/kirjautuminen → palvelin asettaa **httpOnly + Secure + SameSite=Lax** -evästeen (salattu, sisältää käyttäjän id:n).
2. Frontti kysyy `GET /api/auth/me` latautuessaan → tietää onko kirjautunut.
3. `POST /logout` tyhjentää evästeen.

## Route guardit
- **Palvelin (oikea suoja):** jokainen suojattu `/api`-reitti tarkistaa session → 401 jos ei kirjautunut. Käyttäjä pääsee vain **omaan** dataansa (kyselyt aina `where userId = session.userId`).
- **Frontti (vain UX):** `AuthContext` (lataa `me`), `<ProtectedRoute>` ohjaa `/login`iin jos ei kirjautunut.
- **Julkinen aloitussivu (landing)** osoitteessa `/`: esittely + Kirjaudu/Rekisteröidy. Nykyinen "Harjoittele"-valikko siirtyy suojatun alueen taakse (esim. `/app`).

Ehdotettu reititys:
```
Julkinen:   /            (landing)
            /login
            /register
Suojattu:   /app         (Harjoittele-valikko)
            /app/flashcards, /app/phrases, /app/writing, /app/quiz, /app/forms
```

## Frontin palvelukerrokset (jatkaa contentService-mallia)
- `authService` — register/login/logout/me — **jo olemassa stubina**; backend-kytkentä korvaa vain funktioiden rungot.
- `progressService` — get/record (korvaa localStoragen kirjautuneena)
- `useSpacedRepetition` + `useActivityLog` kutsuvat `progressService`ä localStoragen sijaan kirjautuneena. (Sama eristysmalli kuin `aiService`/`contentService` → moduulikoodia ei tarvitse muuttaa.)

## Tietoturva (tarkistuslista)
- **Salasanat:** `argon2` (argon2id) hashays; ei koskaan tallenneta/lokiteta selväkielistä.
- **Eväste:** httpOnly + Secure (HTTPS Funnelilla) + SameSite=Lax, salattu (`SESSION_SECRET`).
- **CSRF:** SameSite=Lax + CSRF-token tilaa muuttaviin POSTeihin (`@fastify/csrf-protection`).
- **Rate limit:** `@fastify/rate-limit` auth-reiteille (brute force -hidastus).
- **Validointi:** Fastifyn JSON-schema jokaiseen reittiin. (Frontin `validation.js` peilaa samat säännöt UX:ää varten.)
- **Otsakkeet:** `@fastify/helmet`.
- **Salaisuudet:** `server/.env` (gitignore) — `SESSION_SECRET`, `DATABASE_URL`; **ei koskaan frontin buildiin**.
- **HTTPS pakollinen** (Funnel hoitaa sertin).

## Repo-rakenne (lisäys)
```
Language_learner/
├── src/                       # frontti (nykyinen; auth-näytöt jo tehty)
├── server/                    # UUSI backend
│   ├── src/
│   │   ├── index.js           # Fastify-app + staattinen serve + SPA-fallback
│   │   ├── routes/{auth,progress,activity}.js
│   │   ├── lib/{prisma,session,password}.js
│   │   └── plugins/{helmet,rateLimit,csrf}.js
│   ├── prisma/schema.prisma
│   ├── .env.example           # SESSION_SECRET, DATABASE_URL
│   └── package.json
├── vite.config.js             # dev-proxy /api -> :3000, base '/'
└── package.json
```

## Tailscale Funnel (julkaisu, ilmainen)
1. Asenna Tailscale läppärille, kirjaudu.
2. Aja tuotantoserveri (Fastify) esim. portissa 3000 (tarjoilee dist + /api).
3. Ota Funnel käyttöön tailnetissä (HTTPS) ja aja `tailscale funnel 3000`.
4. Saat pysyvän julkisen osoitteen `https://<kone>.<tailnet>.ts.net` → tämä on sovelluksen URL (same origin frontille + API:lle).

## Kehitys vs. tuotanto
- **Dev:** kaksi prosessia (esim. `concurrently`): Vite 5173 + Fastify 3000; Vite proxyttaa `/api`.
- **Tuotanto:** `npm run build` → Fastify tarjoilee `dist` + `/api` yhdestä portista → Funnel eteen.

## Toteutusjärjestys (kun rakennetaan)
1. `server/`-scaffold: Fastify + Prisma + SQLite; skeema (User/Progress/Activity); `prisma migrate`.
2. Auth-reitit + secure-session + argon2 + rate-limit + validointi.
3. **Kytke frontti backendiin (frontti jo tehty):** korvaa `authService`-stubin rungot oikeilla `fetch`-kutsuilla; lisää `AuthContext` + `ProtectedRoute`; vaihda reititys landing→`/`, harjoittelu→`/app/*`, `BrowserRouter` + `base '/'`; Login/Register `navigate('/app')`.
4. `progressService`; `useSpacedRepetition`/`useActivityLog` → palvelin (+ valinnainen localStorage-/demo-tuonti).
5. Fastify staattinen serve + SPA-fallback; Vite dev-proxy.
6. Tailscale Funnel + ajo-ohjeet READMEen.
7. Tietoturvan viimeistely + testaus (Fastify `inject`: register/login/logout/me, guard 401, "vain oma data").

## Avoimet / myöhemmät
- Sähköpostivarmennus + salasanan palautus (out of scope nyt).
- Sisällön siirto kantaan (jos halutaan muokata sisältöä ilman deployta) — nyt JSON riittää.
- Siirto Renderiin + Neon-Postgresiin jos sovelluksen pitää olla aina päällä ilman läppäriä (Prisma tekee kannan vaihdon helpoksi).

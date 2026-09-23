# Language Learner

A full-stack language-practice app for Swedish and English, built around a
real Swedish work-life course (JAMK). Practice through flashcards, phrases,
word forms, writing prompts and quizzes; progress is saved to a server for
logged-in users. The in-app UI is in Finnish.

**Live:** https://l460-server.tail7379df.ts.net/

## Features

- **Five practice modules:**
  - **Sanakortit** (Flashcards) — flip card, 3-level self-assessment, swipe
    gestures, sessions limited to a weighted 20-card batch
  - **Fraasipankki** (Phrase bank) — tap-to-reveal, filterable by topic
  - **Muodot** (Word forms) — Swedish inflection chains step by step (verbs:
    presens → preteritum → supinum; nouns: en/ett → definite → plural), multiple
    choice among the word's own forms; each form is its own spaced-repetition card.
    Inflection data from SALDO (Språkbanken Text, CC BY 4.0), see `NOTICE`
  - **Kirjoitus** (Writing) — prompt → own answer → model answer to compare against
  - **Quiz** — multiple choice + fill-in-the-blank, feedback at the end of the session
- A weighted spaced-repetition system decides which items come up more often:
  wrong/hard answers return sooner, learned items are shown rarely.
- **Accounts:** registration/login, with progress and activity synced to the
  server for logged-in users, or kept locally in a no-signup demo mode. New
  registrations queue for manual admin approval before they can log in (see
  [Approving new accounts](#approving-new-accounts)).
- **Content:** 539 flashcards and 308 phrases for the Swedish course (the
  primary language); English ships as a smaller example dataset. Two
  independent tags per item (topic area + category) enable cross-topic review.

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router.
- **Backend:** Node.js 22, Fastify, Prisma ORM + SQLite.
- **Auth/security:** argon2 password hashing, `@fastify/secure-session`
  (httpOnly cookie), CSRF protection, rate limiting.
- **Tests:** Vitest — 128 frontend tests, 37 server tests.

## Live deployment

The app is self-hosted: Fastify serves the built frontend and the `/api/*`
routes from a single origin (no CORS needed), published to the internet via
[Tailscale Funnel](https://tailscale.com/kb/1223/funnel). A systemd unit
(`language-learner.service`) keeps the Fastify process running and restarts
it automatically, including across server reboots.

## Approving new accounts

Registration no longer logs the visitor straight in — creating an account
just queues it (`User.approved` starts `false`), and login is blocked with
an `account_pending` error until an admin approves it. Approve pending
accounts with `server/approve-user.js`:

```bash
cd server
node approve-user.js                  # list everyone waiting for approval
node approve-user.js someone@mail.fi  # look up one account, confirm, approve
```

The second form prints the account's email/display name/registration date
and asks for a `y`/`n` confirmation before writing anything — there's no
bulk-approve or `--force` mode; each account is approved one at a time.

## Local development

### Requirements

Node.js **22** — required by the toolchain (jsdom 30 / undici 8, used by the
component tests, need Node 22+).

### Frontend

```bash
npm install
npm run dev      # http://localhost:5173
```

### Backend

```bash
cd server
npm install
```

Create `server/.env` with two variables (see `server/.env.example` for the
names, and `server/src/lib/session.js` for `SESSION_SECRET`'s length
requirement):

- `DATABASE_URL` — SQLite file path for Prisma
- `SESSION_SECRET` — a random secret used to derive the session cookie key

Then:

```bash
npx prisma migrate dev   # creates the SQLite db + applies migrations
npm run dev              # http://localhost:3000
```

### Running both together

There's no combined `dev` script — run the two commands above in two
separate terminals. Vite proxies `/api/*` to `http://localhost:3000` (see
`vite.config.js`), so the frontend at `:5173` and the backend at `:3000`
behave as one origin in development too.

## Tests

```bash
npm run test           # frontend — 128 tests
cd server && npm test  # server — 37 tests (resets a local SQLite test db first)
```

Both suites run automatically on every push to `main` and on every pull
request (`.github/workflows/test.yml`) — no deploy step, just the test gate.

## Content

Vocabulary/phrases/word-forms/writing content lives per language under
`src/data/<lang>/` as plain JSON (no code changes needed to edit it). Each
item carries two independent tags — a broad topic **area** (`part`) and a
finer **category** — so review can cross topic boundaries. Adding a new
language means adding a new `src/data/<lang>/` folder and a row in
`languages.js`.

## Security

- Passwords hashed with **argon2id** (`argon2`), never logged or stored in
  plain text.
- Session cookie is **httpOnly**, `Secure` outside local dev, `SameSite=Lax`,
  and encrypted (`@fastify/secure-session`).
- **CSRF protection** (`@fastify/csrf-protection`) on all state-changing
  requests.
- **Rate limiting** (`@fastify/rate-limit`) on auth routes.
- **Content-Security-Policy** and other security headers via `@fastify/helmet`.
- **Registration doesn't grant access** — new accounts need manual admin
  approval (`User.approved`) before login succeeds (see
  [Approving new accounts](#approving-new-accounts)).
- Every protected API route scopes queries to the authenticated user — one
  account can never read or write another's data.

## Project structure

```
src/
├── data/         # per-language JSON content (vocabulary, phrases, word forms, writing tasks)
├── services/     # apiClient (fetch + CSRF), authService, progressStore, aiService
├── hooks/        # thin wrappers around context (spaced repetition, activity log), localStorage, theme, AI settings
├── context/      # Auth, Language, Progress, Activity, Filter — app-wide state
├── components/   # the five practice modules + shared UI (Layout, forms, etc.)
├── pages/        # Home, Landing, Login, Register
├── lib/          # pure logic: srLogic, activityLogic, quizLogic, validation, routes
├── App.jsx       # routes + provider tree
└── main.jsx      # entry point

server/
├── src/
│   ├── index.js           # entry point — builds the app and starts listening
│   ├── app.js             # Fastify setup: helmet/CSP, sessions, CSRF, rate limit, static serving
│   ├── routes/            # auth.js, progress.js, activity.js
│   ├── lib/               # prisma.js, session.js, password.js
│   └── generated/prisma/  # generated Prisma client (not hand-edited)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── approve-user.js        # admin CLI: list/approve pending accounts
├── .env.example
└── package.json
```

## Roadmap

Full backlog tracked in `claude/tulevat-muutokset.md`. Near-term items:

- **Phrase bank browsability at scale** — search/filter as the phrase count
  grows past what a scroll-down list handles well.
- **Persistent phrase bank category chips** — keep the topic chips visible
  even in the "all" view (currently hidden, unlike the rest of the app's
  general rule).

## Adding AI later (optional)

The AI interface is isolated in `src/services/aiService.js` (`checkWriting`,
`generateDistractors`) and always returns `null` today — the actual provider
calls aren't implemented yet (see the TODOs in that file). The Writing and
Quiz modules already call these and fall back gracefully, so a real provider
can be plugged in later without touching module code. The storage layer for
a user-supplied API key already exists (`useAiSettings.js`, localStorage-backed,
never committed or baked into the build) but isn't wired to a Settings screen
yet — there's no way to actually set a key through the UI today.

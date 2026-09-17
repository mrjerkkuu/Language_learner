# Language Learner

A mobile-first web app for practising a foreign language through flashcards,
phrases, writing tasks and quizzes. The in-app UI is in Finnish.

It currently ships as a **static MVP** focused on work-life Swedish (ICT), with
all progress saved locally in the browser. It is actively evolving toward a
**multi-language app with user accounts and a backend** — see the Roadmap below.

**Stack:** Vite + React 19 + Tailwind CSS v4 + React Router (BrowserRouter) +
Node.js/Fastify + Prisma/SQLite backend.
**Deploy:** self-hosted (Fastify serves the built frontend + the API from one
origin), published via Tailscale Funnel.

## Status

| Area | Now | Planned |
|---|---|---|
| Content | Work-life Swedish (example ICT data) | Multiple languages — Swedish + English first |
| Users | Single user, no login | Secure registration/login + protected content |
| Storage | Browser `localStorage` | Backend + database |
| AI | None (interface stubbed) | Optional writing feedback |

## Modules (current)

| Module | Practises | How |
|---|---|---|
| **Sanakortit** (Flashcards) | Vocabulary | Flip card, 3-level self-assessment, swipe gestures |
| **Fraasipankki** (Phrase bank) | Small talk & communication | Tap-to-reveal, filterable |
| **Kirjoitus** (Writing) | Written production | Prompt → own answer → model answer |
| **Quiz** | Active recall | Multiple choice + fill-in-the-blank, feedback at the end |

A light, weighted spaced-repetition system decides which items come up more
often: wrong/hard answers return sooner, learned words are shown rarely.

## Local development

Requires Node.js 20+ (LTS).

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # preview the production build locally
```

## Deploy

The app now requires a backend (auth, progress/activity sync — see
`server/`), so it no longer ships as a static GitHub Pages site. Fastify
serves the built frontend (`npm run build` → `dist/`) and the `/api/*` routes
from the same origin (see `server/src/app.js`'s `serveStatic` option), and the
result is published via Tailscale Funnel rather than GitHub Pages.

## Editing the content

All content lives in `src/data/` as plain JSON — no code changes needed. Each
item carries two independent tags:

- `part` — broad topic area (labels in `categories.js`)
- `category` — finer topic (enables cross-area review)

Files: `vocabulary.json`, `phrases.json`, `writingTasks.json`, `fillBlanks.json`.
Replace the example data with real material any time — keep the same field shape.
(Multi-language support will extend this structure per language.)

## Roadmap

Tracked in detail in the project notes (`tulevat-muutokset.md`). Summary:

1. **UI/logic fixes** — flashcard rating becomes right/wrong (easy/hard derived
   automatically), hide the filter row's scrollbar, add a real 3D card-flip
   animation.
2. **Multi-language + word forms** — support several target languages (Swedish
   + English first) and a new exercise type for word forms (e.g. Swedish
   *en/ett*, base and inflected forms). Requires a per-language data model.
3. **Backend + auth + database** — secure registration/login, route guards, a
   public landing page, and moving progress into a database served by a backend.
   Hosting is decided at this stage: the static frontend can stay on GitHub
   Pages calling the API (needs HTTPS backend + CORS), or frontend and backend
   can be served from one origin for simpler, safer auth.

Preparation folded into phases 1–2: isolate data/progress behind a service layer
(like `aiService`) so `localStorage` can later be swapped for a backend API
without touching module code.

## Adding AI later (optional)

The AI interface is isolated in `src/services/aiService.js` (`checkWriting`,
`generateDistractors`), returning `null` until a key is set. The Writing and
Quiz modules already call these and fall back gracefully, so AI can be added
without touching module code. A user's own API key would be stored in
`localStorage` — never committed, never baked into the build.

## Project structure

```
src/
├── data/         # JSON content + category/area labels
├── services/     # aiService.js (provider-agnostic AI interface)
├── hooks/        # localStorage, spaced repetition, activity log, AI settings
├── components/   # UI + the four modules
├── context/      # FilterContext (global area+topic filter)
├── pages/        # Home
├── App.jsx       # routes
└── main.jsx      # entry point
```

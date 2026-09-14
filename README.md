# Työelämän ruotsi — harjoittelusovellus

A mobile-first, fully static web app for practising work-life Swedish (ICT
focus). Single user, no backend, no login — all progress is saved in the
browser's `localStorage`.

**Stack:** Vite + React 19 + Tailwind CSS v4 + React Router (HashRouter).
**Deploy:** GitHub Pages (static).

## Modules

| Module | Practises | How |
|---|---|---|
| **Sanakortit** (Flashcards) | Vocabulary | Flip card, 3-level self-assessment, swipe gestures |
| **Fraasipankki** (Phrase bank) | Small talk & communication | Tap-to-reveal, filterable |
| **Kirjoitus** (Writing) | Written production | Prompt → own answer → model answer |
| **Quiz** | Active recall | Multiple choice + fill-in-the-blank, feedback at the end |

Spaced repetition (a light, weighted system) decides which items come up more
often; wrong/hard answers return sooner, learned words are shown rarely.

## Local development

Requires Node.js 20+ (LTS).

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # preview the production build locally
```

## Deploy to GitHub Pages

**Recommended (automatic):** the workflow in `.github/workflows/deploy.yml`
builds and deploys on every push to `main`. One-time setup:

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
3. Every push to `main` then publishes to
   `https://mrjerkkuu.github.io/Language_learner/`.

**Alternative (manual):** `npm run deploy` (uses the `gh-pages` package to push
the built `dist/` to a `gh-pages` branch).

> **Important:** `vite.config.js` sets `base: '/Language_learner/'`. This must
> match the repository name, or assets break in production. Rename both together
> if you rename the repo.

## Editing the content

All content lives in `src/data/` as plain JSON — no code changes needed to
update it. Each item carries two independent tags:

- `part` — broad topic area (see `categories.js`)
- `category` — finer topic (enables cross-area review)

Files: `vocabulary.json`, `phrases.json`, `writingTasks.json`, `fillBlanks.json`.
Labels for the areas/categories are in `src/data/categories.js`. Replace the
example data with real course material any time — keep the same field shape.

## Adding AI later (optional)

The app ships with no AI. The interface is already isolated in
`src/services/aiService.js` (`checkWriting`, `generateDistractors`), which return
`null` until a key is set. The Writing and Quiz modules already call these and
fall back gracefully, so AI can be added later without touching module code. The
user's own API key would be stored in `localStorage` (never committed, never
baked into the build — GitHub Pages is static).

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

# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project
"Työelämän ruotsi" — a language-practice web app (Swedish + English for working life).
Frontend: React + Vite + Tailwind (`src/`). Backend: Node.js + Fastify + Prisma/SQLite
(`server/`), currently in progress.

## Repository layout
- `src/`            React frontend (existing, fully tested)
- `server/`         Fastify backend + Prisma schema (User / Progress / Activity)
- `claude/`         Planning documents — READ THESE for architecture decisions
- `.claude/agents/` Project subagents (test-runner, code-reviewer)

## Environment
- Node.js 22 is required (Vitest deps jsdom 30 / undici 8 need it; CI runs on Node 22).

## Language conventions
- Code comments and git commit messages: **English**.
- App UI and learning content: **Finnish** (UI) / target language (content).

## Git & commits
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, with a scope where
  useful (e.g. `feat(server): ...`).
- Run the test suite before committing; CI blocks red tests.
- NEVER commit `server/.env` or `*.db` files (they are gitignored). Never print or commit
  the value of SESSION_SECRET.
- NEVER push to GitHub without the maintainer's explicit permission — always ask first.
- Ask before any irreversible action (file or branch deletion, force operations).

## Architecture conventions
- Layering: `lib/` (pure logic) → `hooks/` (state) → `services/` + `context/` (I/O &
  sharing) → UI.
- Any new outside-world connection → its own service (no direct `fetch`/`localStorage`
  in components).
- Any new logic → a pure function in `lib/` + a test.
- New language → `data/<id>/` folder + a row in `languages.js`.
- Storage keys and route paths come from constants (`lib/storageKeys.js`, `lib/routes.js`).
- Version the storage format (`-vN`) when its structure changes.
- Content (words/phrases) stays in frontend JSON; the database stores ONLY users,
  progress, and activity.

## Testing
- Vitest. In automation run one-shot, not watch mode: `npm run test` (or `vitest run`).

## Subagents (.claude/agents/)
- `test-runner` — runs the test suite and reports only the result. Use after code changes.
- `code-reviewer` — security review of backend/auth code. Use before accepting
  auth-related changes.

## Working style
- The maintainer is learning; explain steps briefly and proceed one step at a time when asked.

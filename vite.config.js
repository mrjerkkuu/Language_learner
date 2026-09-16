import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite configuration.
// https://vite.dev/config/
export default defineConfig({
  // Vaihe 3: Fastify now serves the built SPA from its own origin's root
  // (see server/src/app.js's serveStatic), so assets are linked from "/".
  // The old GitHub Pages subfolder deploy ('/Language_learner/') is on hold —
  // see claude/vaihe-3-suunnitelma.md.
  base: '/',

  plugins: [
    react(),        // React + JSX + Fast Refresh
    tailwindcss(),  // Tailwind CSS v4 (CSS-first, no separate tailwind.config.js)
  ],

  // Dev-time proxy so the frontend (Vite, :5173) and backend (Fastify, :3000)
  // behave as one origin, same as production — cookies/CSRF work without CORS.
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },

  // Vitest config. Pure-logic tests run in the default node environment;
  // component tests opt into jsdom with a `// @vitest-environment jsdom`
  // docblock at the top of the file. setup.js registers jest-dom matchers.
  test: {
    globals: true,
    setupFiles: './src/test/setup.js',
    // server/ has its own package.json + vitest.config.js (separate env,
    // separate test DB) and must only be run via `npm test` inside server/.
    exclude: [...configDefaults.exclude, 'server/**'],
  },
})

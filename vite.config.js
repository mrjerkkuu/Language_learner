import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite configuration.
// https://vite.dev/config/
export default defineConfig({
  // CRITICAL for GitHub Pages deployment:
  // The site is published at https://mrjerkkuu.github.io/Language_learner/,
  // i.e. under the subfolder "/Language_learner/". `base` tells Vite to link
  // every asset (JS, CSS, images) relative to this path. Without it the links
  // and assets break in production (you get a blank white page).
  // If the repository is renamed, update this path to match the new name.
  base: '/Language_learner/',

  plugins: [
    react(),        // React + JSX + Fast Refresh
    tailwindcss(),  // Tailwind CSS v4 (CSS-first, no separate tailwind.config.js)
  ],

  // Vitest config. Pure-logic tests run in the default node environment;
  // component tests opt into jsdom with a `// @vitest-environment jsdom`
  // docblock at the top of the file. setup.js registers jest-dom matchers.
  test: {
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})

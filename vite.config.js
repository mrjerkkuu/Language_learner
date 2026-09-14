import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite configuration.
// https://vite.dev/config/
export default defineConfig({
  // KRIITTINEN GitHub Pages -deploylle:
  // Sivusto julkaistaan osoitteessa https://mrjerkkuu.github.io/Language_learner/
  // eli alikansiossa "/Language_learner/". `base` kertoo Vitelle että kaikki
  // assetit (JS, CSS, kuvat) linkitetään suhteessa tähän polkuun. Ilman tätä
  // linkit ja assetit rikkoutuvat tuotannossa (näkyy tyhjänä valkoisena sivuna).
  // Jos repon nimi muuttuu, päivitä tämä polku vastaamaan sitä.
  base: '/Language_learner/',

  plugins: [
    react(),        // React + JSX + Fast Refresh
    tailwindcss(),  // Tailwind CSS v4 (CSS-first, ei erillistä tailwind.config.js:ää)
  ],
})

import { defineConfig } from 'vitest/config'

// Isolated from dev.db and the real SESSION_SECRET — see prisma/test.db and
// the pretest script in package.json, which resets this exact file before
// every run.
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
      SESSION_SECRET: 'test-only-secret-do-not-use-in-prod-please',
      NODE_ENV: 'test',
    },
  },
})

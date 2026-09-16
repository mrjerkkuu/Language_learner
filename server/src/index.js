import { buildApp } from './app.js'

const app = await buildApp({ serveStatic: process.env.NODE_ENV === 'production' })

const PORT = process.env.PORT ?? 3000
try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

import path from 'node:path'
import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import secureSession from '@fastify/secure-session'
import csrfProtection from '@fastify/csrf-protection'
import fastifyStatic from '@fastify/static'
import { deriveSessionKey, sessionOptions } from './lib/session.js'
import authRoutes from './routes/auth.js'

export async function buildApp(opts = {}) {
  // Required so @fastify/rate-limit sees the real client IP (not the proxy's)
  // once this sits behind Tailscale Funnel / any reverse proxy in production.
  const app = Fastify({ logger: opts.logger ?? true, trustProxy: true })

  // index.html's early inline theme script would be blocked by helmet's
  // default CSP. Disabled for now — see claude/vaihe-3-suunnitelma.md for the
  // nonce/hash follow-up needed before a public (Tailscale Funnel) release.
  await app.register(helmet, { contentSecurityPolicy: false })

  // No global limit — only routes that opt in via config.rateLimit are limited.
  await app.register(rateLimit, { global: false })

  await app.register(secureSession, {
    key: deriveSessionKey(process.env.SESSION_SECRET),
    ...sessionOptions,
  })

  await app.register(csrfProtection, { sessionPlugin: '@fastify/secure-session' })

  // Sanitize anything that reaches 5xx (Prisma errors, race conditions, bugs):
  // log the full error server-side, never leak it to the client. Known 4xx
  // errors (schema validation, CSRF, rate limit) already carry safe messages
  // from their own plugins, so those pass through unchanged.
  app.setErrorHandler((err, req, reply) => {
    app.log.error(err)
    const statusCode = err.statusCode ?? 500
    if (statusCode >= 500) {
      return reply.code(500).send({ code: 'internal_error' })
    }
    return reply.code(statusCode).send({ code: err.code ?? 'bad_request', message: err.message })
  })

  app.get('/api/health', async () => ({ ok: true }))
  await app.register(authRoutes, { prefix: '/api/auth' })
  // TODO (Phase B): await app.register(progressRoutes, { prefix: '/api/progress' })
  // TODO (Phase B): await app.register(activityRoutes, { prefix: '/api/activity' })

  if (opts.serveStatic) {
    const root = path.join(import.meta.dirname, '../../dist')
    await app.register(fastifyStatic, { root })
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url?.startsWith('/api')) {
        return reply.code(404).send({ code: 'not_found' })
      }
      return reply.sendFile('index.html')
    })
  }

  return app
}

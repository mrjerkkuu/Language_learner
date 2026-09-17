import path from 'node:path'
import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import secureSession from '@fastify/secure-session'
import csrfProtection from '@fastify/csrf-protection'
import fastifyStatic from '@fastify/static'
import { deriveSessionKey, sessionOptions } from './lib/session.js'
import authRoutes from './routes/auth.js'
import progressRoutes from './routes/progress.js'
import activityRoutes from './routes/activity.js'

export async function buildApp(opts = {}) {
  // Required so @fastify/rate-limit sees the real client IP (not the proxy's)
  // once this sits behind Tailscale Funnel / any reverse proxy in production.
  const app = Fastify({ logger: opts.logger ?? true, trustProxy: true })

  // The early theme-flash-prevention script used to be inline in index.html,
  // which helmet's default CSP would block (script-src has no 'unsafe-inline'
  // by default). Moved to public/theme-init.js and loaded via <script src>
  // instead, so plain script-src 'self' covers it — no nonce/hash plumbing
  // needed. styleSrc/fontSrc allow Google Fonts (the only cross-origin assets
  // the app loads); everything else defaults to 'self'.
  //
  // Umami analytics (index.html) is loaded from cloud.umami.is and, by
  // default (no data-host-url override), reports collected events back to
  // that SAME host — so it needs both scriptSrc (to load script.js) and
  // connectSrc (for its background POST to /api/send) entries, not just one.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cloud.umami.is'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'"],
        connectSrc: ["'self'", 'https://cloud.umami.is'],
        // helmet's default CSP includes upgrade-insecure-requests, which
        // makes the browser rewrite every http:// sub-resource request on
        // the page to https:// — fine once this sits behind Tailscale
        // Funnel (which terminates real HTTPS in front of it), but this
        // Fastify process itself only ever speaks plain HTTP. Rewritten to
        // https:// against a host with no TLS listener, every asset request
        // (scripts, styles) fails outright — a blank page, not a CSP block
        // in the usual sense. `null` removes the directive from the header
        // entirely (helmet's way to drop a default). Re-enable this
        // (remove the `null` override) once Funnel is actually in front and
        // the app is reachable over real HTTPS.
        upgradeInsecureRequests: null,
      },
    },
  })

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
  await app.register(progressRoutes, { prefix: '/api/progress' })
  await app.register(activityRoutes, { prefix: '/api/activity' })

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

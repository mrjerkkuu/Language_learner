import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../lib/password.js'

const registerBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['displayName', 'email', 'password'],
  properties: {
    displayName: { type: 'string', minLength: 1, maxLength: 40 },
    email: { type: 'string', format: 'email', maxLength: 254 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
  },
}

const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 254 },
    // Don't leak the register-time min-length rule on the login path.
    password: { type: 'string', minLength: 1, maxLength: 128 },
  },
}

function toPublicUser(user) {
  return { id: user.id, email: user.email, displayName: user.displayName }
}

export default async function authRoutes(app) {
  app.get('/csrf', async (req, reply) => ({ csrfToken: reply.generateCsrf() }))

  app.post(
    '/register',
    {
      schema: { body: registerBodySchema },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      onRequest: app.csrfProtection,
    },
    async (req, reply) => {
      const { displayName, email, password } = req.body
      const normalizedEmail = email.trim().toLowerCase()

      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      if (existing) {
        return reply.code(409).send({ code: 'email_taken' })
      }

      const passwordHash = await hashPassword(password)
      const user = await prisma.user.create({
        data: { email: normalizedEmail, passwordHash, displayName },
      })

      req.session.set('userId', user.id)
      return reply.code(201).send({ user: toPublicUser(user) })
    },
  )

  app.post(
    '/login',
    {
      schema: { body: loginBodySchema },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      onRequest: app.csrfProtection,
    },
    async (req, reply) => {
      const { email, password } = req.body
      const normalizedEmail = email.trim().toLowerCase()

      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      // Identical response whether the email doesn't exist or the password is
      // wrong — never reveal which one was the actual reason.
      const valid = user ? await verifyPassword(user.passwordHash, password) : false
      if (!valid) {
        return reply.code(401).send({ code: 'bad_credentials' })
      }

      req.session.set('userId', user.id)
      return reply.send({ user: toPublicUser(user) })
    },
  )

  app.post('/logout', { onRequest: app.csrfProtection }, async (req, reply) => {
    req.session.delete()
    return reply.send({ ok: true })
  })

  app.get('/me', async (req, reply) => {
    const userId = req.session.get('userId')
    if (!userId) {
      return reply.code(401).send({ code: 'unauthorized' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      // The session refers to an account that no longer exists.
      req.session.delete()
      return reply.code(401).send({ code: 'unauthorized' })
    }

    return reply.send({ user: toPublicUser(user) })
  })

  // TODO (Phase B/C): POST /import — one-time demo→account progress import,
  // called from the frontend's demo→account transition. Not implemented here.
}

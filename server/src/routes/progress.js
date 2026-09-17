import { prisma } from '../lib/prisma.js'
import { applyResult, defaultCardState } from '../../../src/lib/srLogic.js'

const listQuerySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['language'],
  properties: {
    language: { type: 'string', minLength: 1, maxLength: 10 },
  },
}

const recordBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['language', 'itemId', 'correct'],
  properties: {
    language: { type: 'string', minLength: 1, maxLength: 10 },
    itemId: { type: 'string', minLength: 1, maxLength: 50 },
    correct: { type: 'boolean' },
  },
}

const recordBatchBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['language', 'results'],
  properties: {
    language: { type: 'string', minLength: 1, maxLength: 10 },
    results: {
      type: 'array',
      minItems: 1,
      maxItems: 200,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['itemId', 'correct'],
        properties: {
          itemId: { type: 'string', minLength: 1, maxLength: 50 },
          correct: { type: 'boolean' },
        },
      },
    },
  },
}

// A Prisma Progress row -> the exact card shape srLogic.js works with
// (lastSeen as epoch milliseconds, not a Date/ISO string — srLogic does
// plain number arithmetic on it).
function toClientCard(row) {
  return {
    weight: row.weight,
    lastSeen: row.lastSeen.getTime(),
    timesWrong: row.timesWrong,
    timesCorrect: row.timesCorrect,
    learned: row.learned,
  }
}

function toRowData(card) {
  return {
    weight: card.weight,
    lastSeen: new Date(card.lastSeen),
    timesCorrect: card.timesCorrect,
    timesWrong: card.timesWrong,
    learned: card.learned,
  }
}

async function upsertCard(tx, userId, language, itemId, card) {
  const row = await tx.progress.upsert({
    where: { userId_language_itemId: { userId, language, itemId } },
    create: { userId, language, itemId, ...toRowData(card) },
    update: toRowData(card),
  })
  return toClientCard(row)
}

export default async function progressRoutes(app) {
  app.get('/', { schema: { querystring: listQuerySchema } }, async (req, reply) => {
    const userId = req.session.get('userId')
    if (!userId) {
      return reply.code(401).send({ code: 'unauthorized' })
    }

    const { language } = req.query
    const rows = await prisma.progress.findMany({ where: { userId, language } })
    const items = {}
    for (const row of rows) items[row.itemId] = toClientCard(row)
    return reply.send({ items })
  })

  app.post(
    '/record',
    { schema: { body: recordBodySchema }, onRequest: app.csrfProtection },
    async (req, reply) => {
      const userId = req.session.get('userId')
      if (!userId) {
        return reply.code(401).send({ code: 'unauthorized' })
      }

      const { language, itemId, correct } = req.body
      const existing = await prisma.progress.findUnique({
        where: { userId_language_itemId: { userId, language, itemId } },
      })
      const currentCard = existing ? toClientCard(existing) : defaultCardState()
      const updated = applyResult(currentCard, correct)
      const item = await upsertCard(prisma, userId, language, itemId, updated)
      return reply.send({ item })
    },
  )

  app.post(
    '/record-batch',
    { schema: { body: recordBatchBodySchema }, onRequest: app.csrfProtection },
    async (req, reply) => {
      const userId = req.session.get('userId')
      if (!userId) {
        return reply.code(401).send({ code: 'unauthorized' })
      }

      const { language, results } = req.body
      // Interactive transaction: each item must be read before it's written
      // (applyResult needs the prior card state), so a plain array of
      // operations won't do.
      const items = await prisma.$transaction(async (tx) => {
        const out = {}
        for (const { itemId, correct } of results) {
          const existing = await tx.progress.findUnique({
            where: { userId_language_itemId: { userId, language, itemId } },
          })
          const currentCard = existing ? toClientCard(existing) : defaultCardState()
          const updated = applyResult(currentCard, correct)
          out[itemId] = await upsertCard(tx, userId, language, itemId, updated)
        }
        return out
      })
      return reply.send({ items })
    },
  )
}

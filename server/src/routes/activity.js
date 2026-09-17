import { prisma } from '../lib/prisma.js'
import { todayKey, summarize } from '../../../src/lib/activityLogic.js'

const recordBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['amount'],
  properties: {
    amount: { type: 'integer', minimum: 1, maximum: 100 },
  },
}

// "Today" is computed in the SERVER's local timezone (see activityLogic.js's
// todayKey), not the client's. Fine for a single-household deployment; would
// need revisiting for users spread across timezones.
async function buildSummary(userId) {
  const rows = await prisma.activity.findMany({ where: { userId } })
  const sessions = rows.map((r) => ({ date: r.date, count: r.count }))
  const { todayCount, weekCount, activeDaysThisWeek, currentStreak, bestStreak } = summarize({
    sessions,
  })
  return { today: todayCount, weekCount, activeDaysThisWeek, currentStreak, bestStreak }
}

export default async function activityRoutes(app) {
  app.get('/summary', async (req, reply) => {
    const userId = req.session.get('userId')
    if (!userId) {
      return reply.code(401).send({ code: 'unauthorized' })
    }
    return reply.send(await buildSummary(userId))
  })

  // Independent of /api/progress/record on purpose — several modules log
  // activity without recording a spaced-repetition result (phrase bank
  // reveals, writing tasks), and the ones that do both already call
  // recordResult + logActivity separately client-side, so bundling this
  // into progress/record would double-count.
  app.post(
    '/record',
    { schema: { body: recordBodySchema }, onRequest: app.csrfProtection },
    async (req, reply) => {
      const userId = req.session.get('userId')
      if (!userId) {
        return reply.code(401).send({ code: 'unauthorized' })
      }

      const { amount } = req.body
      const date = todayKey()
      await prisma.activity.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, count: amount },
        update: { count: { increment: amount } },
      })

      return reply.send(await buildSummary(userId))
    },
  )
}

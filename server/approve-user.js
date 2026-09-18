import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { prisma } from './src/lib/prisma.js'

// -----------------------------------------------------------------------------
// approve-user.js — manual admin CLI for approving pending accounts.
// -----------------------------------------------------------------------------
// Not a Fastify route — a one-off script an admin runs by hand:
//   node approve-user.js                  # list everyone pending approval
//   node approve-user.js someone@mail.fi  # look up + confirm + approve one
//
// Safety: every write is preceded by an exact findUnique lookup whose result
// is threaded through (approveUser takes an id, never a bare email), and
// there is no bulk-update / --force / "approve everyone" path.
// -----------------------------------------------------------------------------

export async function listPendingUsers() {
  return prisma.user.findMany({
    where: { approved: false },
    select: { email: true, displayName: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true, approved: true, createdAt: true },
  })
}

// Takes the id from an already-looked-up row, never a raw email — the
// caller must have gone through findUserByEmail() first.
export async function approveUser(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: { approved: true },
    select: { email: true, approved: true },
  })
}

// Pure — no I/O — kept separate from promptYesNo() so it's testable on its
// own without a real readline session.
export function isYes(answer) {
  const normalized = (answer ?? '').trim().toLowerCase()
  return normalized === 'y' || normalized === 'yes'
}

async function promptYesNo(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(question)
    return isYes(answer)
  } finally {
    rl.close()
  }
}

// Dependencies are injectable (with real defaults) purely so tests can spy
// on approve()/confirm() to prove they were NOT called on the
// already-approved path — an ES module's own internal calls to its exported
// functions can't be intercepted by mocking the export from outside.
export async function main({
  argv = process.argv,
  list = listPendingUsers,
  findByEmail = findUserByEmail,
  approve = approveUser,
  confirm = promptYesNo,
  log = console.log,
} = {}) {
  const email = argv[2]

  if (!email) {
    const pending = await list()
    if (pending.length === 0) {
      log('Ei hyväksyntää odottavia käyttäjiä.')
      return
    }
    log(`Hyväksyntää odottavat käyttäjät (${pending.length} kpl):`)
    for (const u of pending) {
      log(`- ${u.email}  (${u.displayName ?? '(ei nimeä)'})  rekisteröity ${u.createdAt.toISOString()}`)
    }
    return
  }

  const user = await findByEmail(email)
  if (!user) {
    log(`Käyttäjää ei löytynyt: ${email}`)
    process.exitCode = 1
    return
  }

  if (user.approved) {
    log(`Käyttäjä ${user.email} on jo hyväksytty. Ei muutoksia.`)
    return
  }

  log('Löytyi hyväksymätön käyttäjä:')
  log(`  email:        ${user.email}`)
  log(`  näyttönimi:   ${user.displayName ?? '(ei nimeä)'}`)
  log(`  rekisteröity: ${user.createdAt.toISOString()}`)

  const confirmed = await confirm(`Hyväksytäänkö käyttäjä ${user.email}? (y/n) `)
  if (!confirmed) {
    log('Peruttu. Ei muutoksia.')
    return
  }

  const result = await approve(user.id)
  log(`Hyväksytty: ${result.email}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch((err) => {
      console.error('Odottamaton virhe:', err)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}

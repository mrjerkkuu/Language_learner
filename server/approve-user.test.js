import { describe, it, expect, vi } from 'vitest'
import { prisma } from './src/lib/prisma.js'
import { listPendingUsers, findUserByEmail, approveUser, isYes, main } from './approve-user.js'

function createUser(overrides) {
  return prisma.user.create({
    data: { passwordHash: 'irrelevant-hash', displayName: 'Testi', ...overrides },
  })
}

describe('isYes', () => {
  it('accepts y/yes case-insensitively, with surrounding whitespace', () => {
    expect(isYes('y')).toBe(true)
    expect(isYes('Y')).toBe(true)
    expect(isYes('yes')).toBe(true)
    expect(isYes('YES')).toBe(true)
    expect(isYes(' y ')).toBe(true)
  })

  it('rejects anything else, including empty input', () => {
    expect(isYes('')).toBe(false)
    expect(isYes('n')).toBe(false)
    expect(isYes('no')).toBe(false)
    expect(isYes('nope')).toBe(false)
    expect(isYes(undefined)).toBe(false)
  })
})

describe('listPendingUsers', () => {
  it('returns only approved:false users, shaped for display, approved ones excluded', async () => {
    await createUser({ email: 'cli-pending-a@example.com', approved: false })
    await createUser({ email: 'cli-pending-b@example.com', approved: false })
    await createUser({ email: 'cli-already-approved@example.com', approved: true })

    const pending = await listPendingUsers()
    const emails = pending.map((u) => u.email)

    expect(emails).toContain('cli-pending-a@example.com')
    expect(emails).toContain('cli-pending-b@example.com')
    expect(emails).not.toContain('cli-already-approved@example.com')
    expect(pending[0]).toEqual(
      expect.objectContaining({ email: expect.any(String), displayName: expect.any(String), createdAt: expect.any(Date) }),
    )
  })

  it('no longer includes a user once they are approved', async () => {
    // Not a global "[]" assertion: server/prisma/test.db is shared across
    // every test FILE in one `npm test` run, so a table-wide delete/empty
    // check here could race with pending-user fixtures other files create
    // concurrently. Scoping to our own fixture's email keeps this safe.
    const created = await createUser({ email: 'cli-pending-c@example.com', approved: false })
    expect((await listPendingUsers()).map((u) => u.email)).toContain('cli-pending-c@example.com')

    await approveUser(created.id)

    expect((await listPendingUsers()).map((u) => u.email)).not.toContain('cli-pending-c@example.com')
  })
})

describe('findUserByEmail', () => {
  it('returns null for an email that does not exist, without throwing', async () => {
    await expect(findUserByEmail('cli-no-such-user@example.com')).resolves.toBeNull()
  })

  it('reports approved:true correctly for an already-approved user', async () => {
    await createUser({ email: 'cli-find-approved@example.com', approved: true })
    const user = await findUserByEmail('cli-find-approved@example.com')
    expect(user.approved).toBe(true)
  })
})

describe('approveUser', () => {
  it('sets approved:true and the write actually lands in the DB, not just the return value', async () => {
    const created = await createUser({ email: 'cli-approve-me@example.com', approved: false })

    const result = await approveUser(created.id)
    expect(result).toEqual({ email: 'cli-approve-me@example.com', approved: true })

    const reloaded = await prisma.user.findUnique({ where: { id: created.id } })
    expect(reloaded.approved).toBe(true)
  })
})

describe('main — already-approved path', () => {
  it('does not call approve() or confirm(), and the DB row is unchanged', async () => {
    await createUser({ email: 'cli-main-already-approved@example.com', approved: true })

    const approve = vi.fn()
    const confirm = vi.fn()
    const log = vi.fn()

    await main({
      argv: ['node', 'approve-user.js', 'cli-main-already-approved@example.com'],
      approve,
      confirm,
      log,
    })

    expect(approve).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()

    const row = await prisma.user.findUnique({ where: { email: 'cli-main-already-approved@example.com' } })
    expect(row.approved).toBe(true)
  })
})

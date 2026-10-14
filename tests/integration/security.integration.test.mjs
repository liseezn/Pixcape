import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { projectAccessWhere } from '../../lib/project-access.ts'
import { incrementRateLimitBucket } from '../../lib/login-rate-limit-store.ts'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required for integration tests.')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

test('PostgreSQL migration, RBAC ownership constraints, and atomic rate limiting', async (t) => {
  const suffix = randomUUID()
  const email = (name) => `${name}-${suffix}@pixcape-test.invalid`
  const createdUserIds = []
  const rateKey = `integration-test:${suffix}`

  try {
    const migration = await prisma.$queryRaw`SELECT to_regclass('"User"') AS users, to_regclass('"Project"') AS projects, to_regclass('"LoginRateLimit"') AS rate_limits`
    assert.ok(migration[0].users, 'User table must exist after applying migrations')
    assert.ok(migration[0].projects, 'Project table must exist after applying migrations')
    assert.ok(migration[0].rate_limits, 'LoginRateLimit table must exist after applying migrations')

    const [owner, other, admin, suspended] = await Promise.all([
      prisma.user.create({ data: { email: email('owner'), name: 'Owner' } }),
      prisma.user.create({ data: { email: email('other'), name: 'Other' } }),
      prisma.user.create({ data: { email: email('admin'), name: 'Admin', role: 'ADMIN' } }),
      prisma.user.create({ data: { email: email('suspended'), name: 'Suspended', status: 'SUSPENDED' } }),
    ])
    createdUserIds.push(owner.id, other.id, admin.id, suspended.id)

    const project = await prisma.project.create({ data: { ownerId: owner.id, title: 'Owner-only test project' } })
    assert.ok(await prisma.project.findFirst({ where: projectAccessWhere({ id: owner.id, role: owner.role, status: owner.status }, project.id) }))
    assert.equal(await prisma.project.findFirst({ where: projectAccessWhere({ id: other.id, role: other.role, status: other.status }, project.id) }), null)
    assert.ok(await prisma.project.findFirst({ where: projectAccessWhere({ id: admin.id, role: admin.role, status: admin.status }, project.id) }))

    const unauthorizedUpdate = await prisma.project.updateMany({
      where: projectAccessWhere({ id: other.id, role: other.role, status: other.status }, project.id),
      data: { title: 'unauthorized overwrite' },
    })
    assert.equal(unauthorizedUpdate.count, 0, 'non-owner update must affect zero rows')
    const ownerUpdate = await prisma.project.updateMany({
      where: projectAccessWhere({ id: owner.id, role: owner.role, status: owner.status }, project.id),
      data: { title: 'owner update passed' },
    })
    assert.equal(ownerUpdate.count, 1)
    const adminUpdate = await prisma.project.updateMany({
      where: projectAccessWhere({ id: admin.id, role: admin.role, status: admin.status }, project.id),
      data: { title: 'admin update passed' },
    })
    assert.equal(adminUpdate.count, 1)

    const increments = await Promise.all(Array.from({ length: 12 }, () => incrementRateLimitBucket(prisma, rateKey, 900)))
    assert.deepEqual(increments.map((r) => r.count).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1), 'concurrent requests must increment atomically')
    assert.ok(increments.every((r) => r.retryAfterSeconds > 0 && r.retryAfterSeconds <= 900))

    const applied = await prisma.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '20261014150000_init' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`
    assert.equal(applied.length, 1, 'initial migration must be recorded as applied')
  } finally {
    await prisma.loginRateLimit.deleteMany({ where: { key: rateKey } })
    if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  }
})

test.after(async () => { await prisma.$disconnect() })

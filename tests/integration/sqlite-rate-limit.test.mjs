import test from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { incrementSqliteRateLimitBucket } from '../../lib/login-rate-limit-store.ts'

const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/pixcape.db'
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }) })

test('SQLite login limiter increments concurrent requests atomically', async () => {
  const key = 'sqlite-integration-' + Date.now()
  try {
    const results = await Promise.all(Array.from({ length: 12 }, () => incrementSqliteRateLimitBucket(prisma, key, 900)))
    assert.deepEqual(results.map((entry) => entry.count).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1))
    assert.ok(results.every((entry) => entry.retryAfterSeconds >= 1 && entry.retryAfterSeconds <= 900))
  } finally {
    await prisma.loginRateLimit.deleteMany({ where: { key } })
    await prisma.$disconnect()
  }
})

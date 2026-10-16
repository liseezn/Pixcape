import test from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { incrementMysqlRateLimitBucket } from '../../lib/login-rate-limit-store.ts'

const connection = new URL(process.env.DATABASE_URL ?? 'mysql://ci:ci@127.0.0.1:3306/pixcape')
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: connection.hostname,
    port: Number(connection.port || 3306),
    user: decodeURIComponent(connection.username),
    password: decodeURIComponent(connection.password),
    database: decodeURIComponent(connection.pathname.replace(/^\\//, '')),
    connectionLimit: 16,
  }),
})

test('MySQL login limiter increments concurrent requests atomically', async () => {
  const key = 'mysql-integration-' + Date.now()
  try {
    const results = await Promise.all(Array.from({ length: 12 }, () =>
      prisma.$transaction((tx) => incrementMysqlRateLimitBucket(tx, key, 900)),
    ))
    assert.deepEqual(results.map((entry) => entry.count).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1))
    assert.ok(results.every((entry) => entry.retryAfterSeconds >= 1 && entry.retryAfterSeconds <= 900))
  } finally {
    await prisma.loginRateLimit.deleteMany({ where: { key } })
    await prisma.$disconnect()
  }
})

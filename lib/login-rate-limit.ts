import 'server-only'
import { createHmac } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

/**
 * Fixed-window limiter stored in PostgreSQL. The ON CONFLICT update is atomic across
 * processes/instances; it does not rely on per-process memory.
 */
export async function consumeLoginRateLimit(clientAddress: string): Promise<RateLimitResult> {
  const limit = parsePositiveInteger(process.env.LOGIN_RATE_LIMIT_MAX, 10, 100)
  const windowSeconds = parsePositiveInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS, 900, 86_400)
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'pixcape-local-only-rate-limit-pepper'
  const normalizedAddress = (clientAddress || 'unknown').trim().slice(0, 128) || 'unknown'
  const key = createHmac('sha256', secret).update('pixcape-login:').update(normalizedAddress).digest('hex')

  const rows = await prisma.$queryRaw<Array<{ count: number; retryAfterSeconds: number }>>`
    INSERT INTO "LoginRateLimit" ("key", "windowStartedAt", "count", "updatedAt")
    VALUES (${key}, NOW(), 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= NOW() - (${windowSeconds} * INTERVAL '1 second') THEN 1
        ELSE "LoginRateLimit"."count" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= NOW() - (${windowSeconds} * INTERVAL '1 second') THEN NOW()
        ELSE "LoginRateLimit"."windowStartedAt"
      END,
      "updatedAt" = NOW()
    RETURNING
      "count",
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("windowStartedAt" + (${windowSeconds} * INTERVAL '1 second') - NOW()))))::int AS "retryAfterSeconds"
  `

  const count = Number(rows[0]?.count ?? limit + 1)
  const retryAfterSeconds = Math.max(1, Number(rows[0]?.retryAfterSeconds ?? windowSeconds))
  if (count % 100 === 0) {
    await prisma.loginRateLimit.deleteMany({
      where: { windowStartedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, key: { not: key } },
    })
  }
  return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), retryAfterSeconds }
}

function parsePositiveInteger(value: string | undefined, fallback: number, maximum: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback
}

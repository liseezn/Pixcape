export type RateLimitBucketResult = { count: number; retryAfterSeconds: number }

/** Atomic PostgreSQL fixed-window increment, usable across application replicas. */
export async function incrementRateLimitBucket(
  database: { $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> },
  key: string,
  windowSeconds: number,
): Promise<RateLimitBucketResult> {
  const rows = await database.$queryRaw<Array<RateLimitBucketResult>>`
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
  if (!rows[0]) throw new Error('Rate-limit bucket update returned no result.')
  return { count: Number(rows[0].count), retryAfterSeconds: Math.max(1, Number(rows[0].retryAfterSeconds)) }
}

export type RateLimitBucketResult = { count: number; retryAfterSeconds: number }

/** Atomic PostgreSQL fixed-window increment, usable across application replicas. */
export async function incrementRateLimitBucket(
  database: { $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> },
  key: string,
  windowSeconds: number,
): Promise<RateLimitBucketResult> {
  const rows = await database.$queryRaw<Array<RateLimitBucketResult>>`
    INSERT INTO "LoginRateLimit" ("key", "windowStartedAt", "count", "updatedAt")
    VALUES (${key}, NOW()::timestamp, 1, NOW()::timestamp)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= NOW()::timestamp - (${windowSeconds}::double precision * INTERVAL '1 second') THEN 1
        ELSE "LoginRateLimit"."count" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= NOW()::timestamp - (${windowSeconds}::double precision * INTERVAL '1 second') THEN NOW()::timestamp
        ELSE "LoginRateLimit"."windowStartedAt"
      END,
      "updatedAt" = NOW()::timestamp
    RETURNING
      "count",
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("windowStartedAt" + (${windowSeconds}::double precision * INTERVAL '1 second') - NOW()::timestamp))))::int AS "retryAfterSeconds"
  `
  if (!rows[0]) throw new Error('Rate-limit bucket update returned no result.')
  return { count: Number(rows[0].count), retryAfterSeconds: Math.max(1, Number(rows[0].retryAfterSeconds)) }
}

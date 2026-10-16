export type RateLimitBucketResult = { count: number; retryAfterSeconds: number }
type RawDatabase = { $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> }
type MysqlTransaction = RawDatabase & { $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number> }

/** Atomic PostgreSQL fixed-window increment, usable across application replicas. */
export async function incrementRateLimitBucket(
  database: RawDatabase,
  key: string,
  windowSeconds: number,
): Promise<RateLimitBucketResult> {
  const rows = await database.$queryRaw<Array<RateLimitBucketResult>>`
    INSERT INTO "LoginRateLimit" ("key", "windowStartedAt", "count", "updatedAt")
    VALUES (${key}, clock_timestamp()::timestamp, 1, clock_timestamp()::timestamp)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= clock_timestamp()::timestamp - (${windowSeconds}::double precision * INTERVAL '1 second') THEN 1
        ELSE "LoginRateLimit"."count" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= clock_timestamp()::timestamp - (${windowSeconds}::double precision * INTERVAL '1 second') THEN clock_timestamp()::timestamp
        ELSE "LoginRateLimit"."windowStartedAt"
      END,
      "updatedAt" = clock_timestamp()::timestamp
    RETURNING
      "count",
      LEAST(${windowSeconds}, GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("windowStartedAt" + (${windowSeconds}::double precision * INTERVAL '1 second') - clock_timestamp()::timestamp)))))::int AS "retryAfterSeconds"
  `
  if (!rows[0]) throw new Error('Rate-limit bucket update returned no result.')
  return { count: Number(rows[0].count), retryAfterSeconds: Math.max(1, Number(rows[0].retryAfterSeconds)) }
}

/** MySQL atomic upsert followed by a read in the same transaction/connection scope. */
export async function incrementMysqlRateLimitBucket(
  database: MysqlTransaction,
  key: string,
  windowSeconds: number,
): Promise<RateLimitBucketResult> {
  await database.$executeRaw`
    INSERT INTO `LoginRateLimit` (`key`, `windowStartedAt`, `count`, `updatedAt`)
    VALUES (${key}, UTC_TIMESTAMP(3), 1, UTC_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      `count` = IF(`windowStartedAt` <= UTC_TIMESTAMP(3) - INTERVAL ${windowSeconds} SECOND, 1, `count` + 1),
      `windowStartedAt` = IF(`windowStartedAt` <= UTC_TIMESTAMP(3) - INTERVAL ${windowSeconds} SECOND, UTC_TIMESTAMP(3), `windowStartedAt`),
      `updatedAt` = UTC_TIMESTAMP(3)
  `
  const rows = await database.$queryRaw<Array<{ count: number; retryAfterSeconds: number }>>`
    SELECT `count`, GREATEST(1, LEAST(${windowSeconds}, CEIL(${windowSeconds} - TIMESTAMPDIFF(MICROSECOND, `windowStartedAt`, UTC_TIMESTAMP(3)) / 1000000))) AS `retryAfterSeconds`
    FROM `LoginRateLimit` WHERE `key` = ${key} FOR UPDATE
  `
  if (!rows[0]) throw new Error('MySQL rate-limit bucket update returned no result.')
  return { count: Number(rows[0].count), retryAfterSeconds: Math.max(1, Number(rows[0].retryAfterSeconds)) }
}

/** SQLite atomic upsert; the unique key serializes updates to one bucket. */
export async function incrementSqliteRateLimitBucket(database: RawDatabase, key: string, windowSeconds: number): Promise<RateLimitBucketResult> {
  const rows = await database.$queryRaw<Array<RateLimitBucketResult>>`
    INSERT INTO "LoginRateLimit" ("key", "windowStartedAt", "count", "updatedAt")
    VALUES (${key}, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN julianday("LoginRateLimit"."windowStartedAt") <= julianday('now', '-' || ${windowSeconds} || ' seconds') THEN 1 ELSE "LoginRateLimit"."count" + 1 END,
      "windowStartedAt" = CASE WHEN julianday("LoginRateLimit"."windowStartedAt") <= julianday('now', '-' || ${windowSeconds} || ' seconds') THEN CURRENT_TIMESTAMP ELSE "LoginRateLimit"."windowStartedAt" END,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count", MAX(1, MIN(${windowSeconds}, CAST((julianday("windowStartedAt") + (${windowSeconds} / 86400.0) - julianday('now')) * 86400 AS INTEGER))) AS "retryAfterSeconds"
  `
  if (!rows[0]) throw new Error('SQLite rate-limit bucket update returned no result.')
  return { count: Number(rows[0].count), retryAfterSeconds: Math.max(1, Number(rows[0].retryAfterSeconds)) }
}

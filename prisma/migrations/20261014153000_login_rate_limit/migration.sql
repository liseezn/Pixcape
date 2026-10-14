-- Persistent atomic login throttling. Kept as a separate migration so an already-applied init migration is never edited.
CREATE TABLE "LoginRateLimit" (
  "key" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "LoginRateLimit_windowStartedAt_idx" ON "LoginRateLimit"("windowStartedAt");

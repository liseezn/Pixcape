-- Initial SQLite schema for Pixcape's Next.js account system.
CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT, "email" TEXT, "emailVerified" DATETIME, "image" TEXT, "role" TEXT NOT NULL DEFAULT 'USER', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "CreatorProfile" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "displayName" TEXT NOT NULL, "bio" TEXT NOT NULL DEFAULT '', "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");
CREATE TABLE "Project" ("id" TEXT NOT NULL PRIMARY KEY, "ownerId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "visibility" TEXT NOT NULL DEFAULT 'PRIVATE', "assetKey" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "Project_ownerId_updatedAt_idx" ON "Project"("ownerId", "updatedAt");
CREATE TABLE "AuditLog" ("id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL, "details" JSONB, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");
CREATE TABLE "LoginRateLimit" ("key" TEXT NOT NULL PRIMARY KEY, "windowStartedAt" DATETIME NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, "updatedAt" DATETIME NOT NULL);
CREATE INDEX "LoginRateLimit_windowStartedAt_idx" ON "LoginRateLimit"("windowStartedAt");
CREATE TABLE "Account" ("userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER, "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT, CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("provider", "providerAccountId"));
CREATE TABLE "Session" ("sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" DATETIME NOT NULL, CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE TABLE "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" DATETIME NOT NULL);
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

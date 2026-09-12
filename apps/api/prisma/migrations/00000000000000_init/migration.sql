-- CreateEnum
CREATE TYPE "ServiceConsumerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable RefreshToken
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable RoleAssignment
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog (note: userId/resourceName intentionally nullable at creation
-- so the cleanup below can run against existing/backfilled rows, then we SET NOT NULL)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "ipAddress" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceName" TEXT,
    "userId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable GatewayService
CREATE TABLE "GatewayService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kongName" TEXT NOT NULL,
    "tags" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GatewayService_pkey" PRIMARY KEY ("id")
);

-- CreateTable KongConsumer
CREATE TABLE "KongConsumer" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "customId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KongConsumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable ServiceConsumer
CREATE TABLE "ServiceConsumer" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "status" "ServiceConsumerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceConsumer_pkey" PRIMARY KEY ("id")
);

-- Clean legacy AuditLog rows before enforcing NOT NULL
DELETE FROM "AuditLog" WHERE "userId" IS NULL OR "userId" = '' OR "resourceName" IS NULL OR "resourceName" = '';

-- Enforce NOT NULL on AuditLog target columns
ALTER TABLE "AuditLog" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "resourceName" SET NOT NULL;

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE UNIQUE INDEX "RoleAssignment_userId_role_resourceId_resourceType_key" ON "RoleAssignment"("userId", "role", "resourceId", "resourceType");
CREATE INDEX "RoleAssignment_userId_idx" ON "RoleAssignment"("userId");
CREATE INDEX "RoleAssignment_resourceId_idx" ON "RoleAssignment"("resourceId");

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX "GatewayService_name_idx" ON "GatewayService"("name");

CREATE INDEX "KongConsumer_username_idx" ON "KongConsumer"("username");
CREATE UNIQUE INDEX "KongConsumer_username_key" ON "KongConsumer"("username") WHERE "username" IS NOT NULL;
CREATE UNIQUE INDEX "KongConsumer_customId_key" ON "KongConsumer"("customId") WHERE "customId" IS NOT NULL;

CREATE UNIQUE INDEX "ServiceConsumer_serviceId_consumerId_key" ON "ServiceConsumer"("serviceId", "consumerId");

-- Foreign keys
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceConsumer" ADD CONSTRAINT "ServiceConsumer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "GatewayService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceConsumer" ADD CONSTRAINT "ServiceConsumer_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "KongConsumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

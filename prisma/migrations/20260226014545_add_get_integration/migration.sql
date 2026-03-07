-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completionReason" TEXT,
ADD COLUMN     "selectedFulfillmentMode" TEXT;

-- CreateTable
CREATE TABLE "GetCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "encryptedPin" TEXT,
    "encryptedSessionToken" TEXT,
    "sessionFingerprint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'linked',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GetCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GetFulfillment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "baselineAccountsJson" TEXT,
    "completedAt" TIMESTAMP(3),
    "completionReason" TEXT,
    "completionDelta" DOUBLE PRECISION,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GetFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GetCredential_userId_key" ON "GetCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GetFulfillment_requestId_key" ON "GetFulfillment"("requestId");

-- AddForeignKey
ALTER TABLE "GetCredential" ADD CONSTRAINT "GetCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GetFulfillment" ADD CONSTRAINT "GetFulfillment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GetFulfillment" ADD CONSTRAINT "GetFulfillment_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GetFulfillment" ADD CONSTRAINT "GetFulfillment_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

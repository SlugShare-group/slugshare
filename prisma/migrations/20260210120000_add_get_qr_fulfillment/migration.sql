-- AlterTable
ALTER TABLE "User"
ADD COLUMN "defaultFulfillmentMode" TEXT NOT NULL DEFAULT 'CODE_ONLY';

-- AlterTable
ALTER TABLE "Request"
ADD COLUMN "fulfillmentMode" TEXT,
ADD COLUMN "codeIssuedAt" TIMESTAMP(3),
ADD COLUMN "codeExpiresAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completionTrigger" TEXT;

-- CreateTable
CREATE TABLE "GetCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedDeviceId" TEXT NOT NULL,
    "encryptedPin" TEXT NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GetCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GetCredential_userId_key" ON "GetCredential"("userId");

-- AddForeignKey
ALTER TABLE "GetCredential" ADD CONSTRAINT "GetCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

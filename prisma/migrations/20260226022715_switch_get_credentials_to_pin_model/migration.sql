-- AlterTable
ALTER TABLE "GetCredential" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "encryptedPin" TEXT,
ALTER COLUMN "encryptedSessionToken" DROP NOT NULL,
ALTER COLUMN "sessionFingerprint" DROP NOT NULL;

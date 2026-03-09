-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "autoPullQrEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoPullQrThreshold" DOUBLE PRECISION;

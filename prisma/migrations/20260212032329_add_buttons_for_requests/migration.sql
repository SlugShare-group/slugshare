-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "inPersonAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "qrCodeAllowed" BOOLEAN NOT NULL DEFAULT false;

/*
  Warnings:

  - The `claimStatus` column on the `claims` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('HIDDEN', 'SHOW', 'BLOCKED');

-- AlterTable
ALTER TABLE "claims" ALTER COLUMN "claimType" DROP NOT NULL,
DROP COLUMN "claimStatus",
ADD COLUMN     "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'SHOW';

-- CreateTable
CREATE TABLE "claim_medias" (
    "claimId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "claim_medias_pkey" PRIMARY KEY ("claimId","mediaId")
);

-- AddForeignKey
ALTER TABLE "claim_medias" ADD CONSTRAINT "claim_medias_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_medias" ADD CONSTRAINT "claim_medias_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "medias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('CASE', 'CLAIM', 'EVIDENCE', 'SOURCE');

-- CreateTable
CREATE TABLE "opinions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "value" TEXT,
    "targetType" "TargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opinions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opinion_medias" (
    "opinionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "opinion_medias_pkey" PRIMARY KEY ("opinionId","mediaId")
);

-- CreateTable
CREATE TABLE "opinion_sources" (
    "opinionId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opinion_sources_pkey" PRIMARY KEY ("opinionId","sourceId")
);

-- CreateIndex
CREATE INDEX "opinions_targetType_targetId_idx" ON "opinions"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "opinions_authorId_idx" ON "opinions"("authorId");

-- CreateIndex
CREATE INDEX "opinions_parentId_idx" ON "opinions"("parentId");

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "opinions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinion_medias" ADD CONSTRAINT "opinion_medias_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinion_medias" ADD CONSTRAINT "opinion_medias_opinionId_fkey" FOREIGN KEY ("opinionId") REFERENCES "opinions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinion_sources" ADD CONSTRAINT "opinion_sources_opinionId_fkey" FOREIGN KEY ("opinionId") REFERENCES "opinions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinion_sources" ADD CONSTRAINT "opinion_sources_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

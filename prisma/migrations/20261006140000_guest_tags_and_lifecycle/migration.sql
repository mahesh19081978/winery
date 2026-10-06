-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('ACTIVE', 'VIP', 'PROSPECT', 'INACTIVE', 'BLOCKED');

-- AlterTable
ALTER TABLE "guest_profiles" ADD COLUMN "status" "GuestStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "guest_tags" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#6c2432',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_tag_assignments" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "guestTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_tags_wineryId_idx" ON "guest_tags"("wineryId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_tags_wineryId_name_key" ON "guest_tags"("wineryId", "name");

-- CreateIndex
CREATE INDEX "guest_tag_assignments_guestProfileId_idx" ON "guest_tag_assignments"("guestProfileId");

-- CreateIndex
CREATE INDEX "guest_tag_assignments_guestTagId_idx" ON "guest_tag_assignments"("guestTagId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_tag_assignments_guestProfileId_guestTagId_key" ON "guest_tag_assignments"("guestProfileId", "guestTagId");

-- CreateIndex
CREATE INDEX "guest_profiles_status_idx" ON "guest_profiles"("status");

-- AddForeignKey
ALTER TABLE "guest_tags" ADD CONSTRAINT "guest_tags_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_tag_assignments" ADD CONSTRAINT "guest_tag_assignments_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_tag_assignments" ADD CONSTRAINT "guest_tag_assignments_guestTagId_fkey" FOREIGN KEY ("guestTagId") REFERENCES "guest_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

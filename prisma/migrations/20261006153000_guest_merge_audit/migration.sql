-- CreateTable
CREATE TABLE "guest_merge_audits" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "targetGuestId" TEXT NOT NULL,
    "sourceGuestId" TEXT NOT NULL,
    "sourceGuestEmail" TEXT NOT NULL,
    "sourceGuestName" TEXT NOT NULL,
    "mergedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_merge_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_merge_audits_wineryId_createdAt_idx" ON "guest_merge_audits"("wineryId", "createdAt");

-- CreateIndex
CREATE INDEX "guest_merge_audits_targetGuestId_idx" ON "guest_merge_audits"("targetGuestId");

-- CreateIndex
CREATE INDEX "guest_merge_audits_sourceGuestId_idx" ON "guest_merge_audits"("sourceGuestId");

-- CreateIndex
CREATE INDEX "guest_merge_audits_mergedByUserId_idx" ON "guest_merge_audits"("mergedByUserId");

-- AddForeignKey
ALTER TABLE "guest_merge_audits" ADD CONSTRAINT "guest_merge_audits_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_merge_audits" ADD CONSTRAINT "guest_merge_audits_targetGuestId_fkey" FOREIGN KEY ("targetGuestId") REFERENCES "guest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_merge_audits" ADD CONSTRAINT "guest_merge_audits_mergedByUserId_fkey" FOREIGN KEY ("mergedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

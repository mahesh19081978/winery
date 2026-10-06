-- CreateTable
CREATE TABLE "guest_notes" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_notes_guestProfileId_createdAt_idx" ON "guest_notes"("guestProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "guest_notes_wineryId_idx" ON "guest_notes"("wineryId");

-- CreateIndex
CREATE INDEX "guest_notes_authorId_idx" ON "guest_notes"("authorId");

-- AddForeignKey
ALTER TABLE "guest_notes" ADD CONSTRAINT "guest_notes_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_notes" ADD CONSTRAINT "guest_notes_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_notes" ADD CONSTRAINT "guest_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

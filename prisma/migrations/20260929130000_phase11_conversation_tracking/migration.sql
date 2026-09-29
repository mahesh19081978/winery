-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "wineryId" TEXT NOT NULL DEFAULT 'bd1034e9-36ef-463b-a576-019e1193621f';

-- AlterTable
ALTER TABLE "conversation_messages" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "conversations_wineryId_idx" ON "conversations"("wineryId");

-- CreateIndex
CREATE INDEX "conversations_sessionId_idx" ON "conversations"("sessionId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

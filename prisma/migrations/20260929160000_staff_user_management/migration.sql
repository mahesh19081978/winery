-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

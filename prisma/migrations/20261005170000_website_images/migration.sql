-- CreateTable
CREATE TABLE "website_images" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "pageGroup" TEXT NOT NULL,
    "url" TEXT,
    "altText" TEXT,
    "source" TEXT NOT NULL DEFAULT 'DEFAULT',
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "defaultUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "mime" TEXT,
    "uploadedFilename" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_images_wineryId_idx" ON "website_images"("wineryId");

-- CreateIndex
CREATE UNIQUE INDEX "website_images_wineryId_key_key" ON "website_images"("wineryId", "key");

-- AddForeignKey
ALTER TABLE "website_images" ADD CONSTRAINT "website_images_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_images" ADD CONSTRAINT "website_images_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

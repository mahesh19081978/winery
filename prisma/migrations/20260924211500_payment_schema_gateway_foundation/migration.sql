-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_CONFIRMATION';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_PROCESSED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "event_bookings" ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "errorCode" TEXT,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "eventBookingId" TEXT,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "providerOrderId" TEXT,
ADD COLUMN "providerSignature" TEXT,
ADD COLUMN "refundAmount" DECIMAL(10,2),
ADD COLUMN "refundId" TEXT,
ADD COLUMN "refundReason" TEXT,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_eventId_key" ON "webhook_events"("eventId");

-- CreateIndex
CREATE INDEX "webhook_events_provider_eventType_idx" ON "webhook_events"("provider", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerOrderId_key" ON "payments"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_eventBookingId_idx" ON "payments"("eventBookingId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

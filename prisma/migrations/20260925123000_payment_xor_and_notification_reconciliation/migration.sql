-- AlterEnum: Reconcile NotificationType back to original values without payment notification types
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'BOOKING_MODIFICATION', 'BOOKING_CANCELLATION', 'EVENT_REMINDER', 'REVIEW_REQUEST');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- AddCheckConstraint: Database-level XOR integrity for Payment relationships
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_xor_check"
CHECK (
  ("bookingId" IS NOT NULL AND "eventBookingId" IS NULL)
  OR
  ("bookingId" IS NULL AND "eventBookingId" IS NOT NULL)
);

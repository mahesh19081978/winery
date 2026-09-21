-- DropForeignKey
ALTER TABLE "event_bookings" DROP CONSTRAINT "event_bookings_eventTicketTypeId_fkey";

-- AlterTable
ALTER TABLE "event_bookings" DROP COLUMN "eventTicketTypeId",
DROP COLUMN "ticketCount",
ADD COLUMN     "bookingNumber" TEXT NOT NULL,
ADD COLUMN     "eventScheduleId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "event_booking_tickets" (
    "id" TEXT NOT NULL,
    "eventBookingId" TEXT NOT NULL,
    "eventTicketTypeId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_booking_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_booking_status_histories" (
    "id" TEXT NOT NULL,
    "eventBookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus" NOT NULL,
    "toStatus" "BookingStatus" NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_booking_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_booking_tickets_eventBookingId_idx" ON "event_booking_tickets"("eventBookingId");

-- CreateIndex
CREATE INDEX "event_booking_tickets_eventTicketTypeId_idx" ON "event_booking_tickets"("eventTicketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "event_booking_tickets_eventBookingId_eventTicketTypeId_key" ON "event_booking_tickets"("eventBookingId", "eventTicketTypeId");

-- CreateIndex
CREATE INDEX "event_booking_status_histories_eventBookingId_idx" ON "event_booking_status_histories"("eventBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "event_bookings_bookingNumber_key" ON "event_bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "event_bookings_eventScheduleId_idx" ON "event_bookings"("eventScheduleId");

-- CreateIndex
CREATE INDEX "event_bookings_status_idx" ON "event_bookings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_schedules_id_eventId_key" ON "event_schedules"("id", "eventId");

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_eventScheduleId_eventId_fkey" FOREIGN KEY ("eventScheduleId", "eventId") REFERENCES "event_schedules"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_booking_tickets" ADD CONSTRAINT "event_booking_tickets_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_booking_tickets" ADD CONSTRAINT "event_booking_tickets_eventTicketTypeId_fkey" FOREIGN KEY ("eventTicketTypeId") REFERENCES "event_ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_booking_status_histories" ADD CONSTRAINT "event_booking_status_histories_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "event_booking_reschedule_histories" (
    "id" TEXT NOT NULL,
    "eventBookingId" TEXT NOT NULL,
    "previousScheduleId" TEXT NOT NULL,
    "previousTimeSlot" TEXT NOT NULL,
    "newScheduleId" TEXT NOT NULL,
    "newTimeSlot" TEXT NOT NULL,
    "rescheduledBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_booking_reschedule_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_booking_reschedule_histories_eventBookingId_idx" ON "event_booking_reschedule_histories"("eventBookingId");

-- AddForeignKey
ALTER TABLE "event_booking_reschedule_histories" ADD CONSTRAINT "event_booking_reschedule_histories_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

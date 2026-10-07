-- CreateTable
CREATE TABLE "booking_reschedule_histories" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "previousDate" DATE NOT NULL,
    "previousTime" TEXT NOT NULL,
    "newDate" DATE NOT NULL,
    "newTime" TEXT NOT NULL,
    "previousExperienceId" TEXT,
    "newExperienceId" TEXT,
    "rescheduledBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reschedule_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_reschedule_histories_bookingId_idx" ON "booking_reschedule_histories"("bookingId");

-- AddForeignKey
ALTER TABLE "booking_reschedule_histories" ADD CONSTRAINT "booking_reschedule_histories_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

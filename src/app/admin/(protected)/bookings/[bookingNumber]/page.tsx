import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { BookingDetailClient } from './BookingDetailClient';

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const session = await AuthService.getSession();
  const { bookingNumber } = await params;

  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: {
      guestProfile: {
        include: {
          user: true,
        },
      },
      items: {
        include: { experience: true },
      },
      attendees: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
      payments: true,
    },
  });

  if (!booking) {
    notFound();
  }

  const experiences = await prisma.experience.findMany({
    where: { isActive: true },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  return (
    <BookingDetailClient
      booking={JSON.parse(JSON.stringify(booking))}
      experiences={experiences}
      adminEmail={session?.email || ''}
      adminRole={session?.role || ''}
    />
  );
}

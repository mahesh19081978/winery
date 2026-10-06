import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPermissions, requirePagePermission } from '@/lib/auth/permissions';
import { BookingDetailClient } from './BookingDetailClient';

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const session = await requirePagePermission('bookings.view');
  const { bookingNumber } = await params;

  // Reconcile before display so status is authoritative
  const { BookingRepository } = await import('@/server/repositories');
  await BookingRepository.reconcileExpiredExperienceBookings(session.wineryId || undefined);

  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: {
      winery: {
        select: {
          timezone: true,
        },
      },
      guestProfile: {
        include: {
          user: true,
        },
      },
      items: {
        include: {
          experience: {
            select: {
              id: true,
              title: true,
              slug: true,
              durationMinutes: true,
            },
          },
        },
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

  if (session.role !== 'SUPER_ADMIN' && booking.wineryId !== session.wineryId) {
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
      adminEmail={session.email || ''}
      adminRole={session.role || ''}
      permissions={getPermissions(session.role)}
    />
  );
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const guard = await requireApiPermission('profiles.view');
    if (!guard.ok) return guard.response;

    const profiles = await prisma.guestWinePreference.findMany({
      include: {
        guestProfile: {
          select: {
            id: true,
            name: true,
            phone: true,
            visitsCount: true,
            user: { select: { email: true } },
            _count: {
              select: {
                bookings: true,
                tastingSessions: true,
                tastingRecords: true,
                reviews: true,
              },
            },
          },
        },
        favoriteWine: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        profiles,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch wine profiles';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

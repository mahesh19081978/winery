import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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

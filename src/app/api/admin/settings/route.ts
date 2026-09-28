import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const winery = await prisma.winery.findFirst({
      include: {
        closures: {
          orderBy: { startDate: 'asc' },
        },
        availabilityRules: {
          include: { experience: { select: { title: true } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        winery,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch estate settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const vintages = await prisma.wineVintage.findMany({
      include: {
        wine: {
          select: {
            id: true,
            slug: true,
            name: true,
            category: true,
            characteristics: true,
            servingTemp: true,
            cellarPotential: true,
          },
        },
        _count: {
          select: { tastingRecords: true },
        },
      },
      orderBy: [{ vintageYear: 'desc' }, { wine: { name: 'asc' } }],
    });

    return NextResponse.json({
      success: true,
      data: {
        vintages,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch vintages';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

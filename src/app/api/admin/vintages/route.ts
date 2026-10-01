import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const guard = await requireApiPermission('vintages.manage');
    if (!guard.ok) return guard.response;

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

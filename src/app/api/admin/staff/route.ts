import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const staffMembers = await prisma.user.findMany({
      where: {
        role: { not: 'GUEST' },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        staff: staffMembers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch staff members';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

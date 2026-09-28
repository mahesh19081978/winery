import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      include: {
        guestProfile: {
          select: {
            id: true,
            name: true,
            phone: true,
            user: { select: { email: true } },
          },
        },
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        conversations,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

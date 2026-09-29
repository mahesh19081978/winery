import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export async function GET() {
  try {
    const session = await AuthService.getSession();
    if (!session || !AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === UserRole.SUPER_ADMIN;
    
    // Ensure standard staff have a wineryId
    if (!isSuperAdmin && !session.wineryId) {
       return NextResponse.json({ success: false, error: 'Winery context missing' }, { status: 400 });
    }

    const whereClause = isSuperAdmin ? {} : { wineryId: session.wineryId! };

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
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

    // Strip the raw internal sessionId so it is never exposed in the admin API response.
    const mappedConversations = conversations.map(c => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sessionId: _sessionId, ...conversation } = c;
        return {
            ...conversation,
            isAnonymous: !c.guestProfileId,
        };
    });

    return NextResponse.json({
      success: true,
      data: {
        conversations: mappedConversations,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

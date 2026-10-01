import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireApiPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('inquiries.view');
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const safePage = Math.max(1, isNaN(page) ? 1 : page);
    const safePageSize = Math.min(50, Math.max(1, isNaN(pageSize) ? 20 : pageSize));

    const where: Prisma.ContactInquiryWhereInput = {};

    if (session.wineryId) {
      where.wineryId = session.wineryId;
    }

    if (status && ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'].includes(status)) {
      where.status = status as 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, inquiries, statusCounts] = await Promise.all([
      prisma.contactInquiry.count({ where }),
      prisma.contactInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.contactInquiry.groupBy({
        by: ['status'],
        where: session.wineryId ? { wineryId: session.wineryId } : {},
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = {
      ALL: total,
      NEW: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      ARCHIVED: 0,
    };
    statusCounts.forEach((c) => {
      counts[c.status] = c._count.status;
    });

    return NextResponse.json({
      success: true,
      data: {
        inquiries,
        pagination: {
          page: safePage,
          pageSize: safePageSize,
          total,
          totalPages: Math.ceil(total / safePageSize),
        },
        counts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contact inquiries';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

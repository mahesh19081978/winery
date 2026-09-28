import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { PaymentService } from '@/server/services';

const BOOKING_TYPES = ['EXPERIENCE', 'EVENT'] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await AuthService.getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || undefined;

    const statusParam = searchParams.get('status')?.trim() || undefined;
    if (statusParam && !Object.values(PaymentStatus).includes(statusParam as PaymentStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid payment status: ${statusParam}` },
        { status: 400 }
      );
    }

    const bookingTypeParam = searchParams.get('bookingType')?.trim() || undefined;
    if (bookingTypeParam && !BOOKING_TYPES.includes(bookingTypeParam as (typeof BOOKING_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: `Invalid booking type: ${bookingTypeParam}` },
        { status: 400 }
      );
    }

    const dateFrom = searchParams.get('dateFrom')?.trim() || undefined;
    const dateTo = searchParams.get('dateTo')?.trim() || undefined;
    for (const [label, value] of [['dateFrom', dateFrom], ['dateTo', dateTo]] as const) {
      if (value && Number.isNaN(new Date(value).getTime())) {
        return NextResponse.json(
          { success: false, error: `Invalid ${label}. Expected an ISO date.` },
          { status: 400 }
        );
      }
    }

    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const pageSize = Math.max(parseInt(searchParams.get('pageSize') || '20', 10) || 20, 1);

    const result = await PaymentService.listForAdmin({
      search,
      status: statusParam as PaymentStatus | undefined,
      bookingType: bookingTypeParam as (typeof BOOKING_TYPES)[number] | undefined,
      dateFrom,
      dateTo,
      wineryId: session.wineryId,
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

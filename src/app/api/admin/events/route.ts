import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '@/server/services';
import { EventCreateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';


export async function GET(request: NextRequest) {
  try {
    const guard = await requireApiPermission('events.manage');
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const availability = searchParams.get('availability') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await EventService.listEventsAdmin({
      search,
      status,
      availability,
      dateFrom,
      dateTo,
      page,
      pageSize: Math.min(pageSize, 50),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireApiPermission('events.manage');
    if (!guard.ok) return guard.response;

    const body = await request.json();
    // Strip forbidden fields unconditionally
    if ('soldCount' in body) delete body.soldCount;
    const validated = EventCreateSchema.parse(body);
    const event = await EventService.createEvent(validated);
    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown; errors?: unknown };
      return NextResponse.json({ success: false, error: 'Validation failed', details: zod.issues || zod.errors }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed to create event';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to create event';
    if (message.includes('already exists')) return NextResponse.json({ success: false, error: message }, { status: 409 });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

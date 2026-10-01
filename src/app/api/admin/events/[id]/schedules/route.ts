import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '@/server/services';
import { EventScheduleCreateSchema } from '@/server/validators';
import { requireApiPermission } from '@/lib/auth/permissions';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireApiPermission('events.manage', request);
    if (!guard.ok) return guard.response;
    const { id } = await params;
    const body = await request.json();
    const validated = EventScheduleCreateSchema.parse(body);
    const schedule = await EventService.createSchedule(id, validated);
    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      const zod = error as { issues?: unknown };
      return NextResponse.json({ success: false, error: 'Validation failed', details: zod.issues }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const sc = (error as { statusCode: number }).statusCode;
      const msg = error instanceof Error ? error.message : 'Failed';
      return NextResponse.json({ success: false, error: msg }, { status: sc });
    }
    const message = error instanceof Error ? error.message : 'Failed to create schedule';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

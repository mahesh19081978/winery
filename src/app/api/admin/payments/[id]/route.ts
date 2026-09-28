import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { PaymentService } from '@/server/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!AuthService.isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Payment id is required' }, { status: 400 });
    }

    const payment = await PaymentService.getForAdmin(id, session.wineryId);
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

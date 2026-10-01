import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { can } from '@/lib/auth/permissions';
import { PaymentService } from '@/server/services';
import { PaymentManualCreateSchema } from '@/server/validators';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthService.getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.role, 'payments.record')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = PaymentManualCreateSchema.parse(body);

    const result = await PaymentService.createManualPayment(validated, {
      isStaff: true,
      email: session.email,
      role: session.role,
      wineryId: session.wineryId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[POST /api/admin/payments/manual] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create manual payment';
    const status =
      error instanceof Error && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode ?? 400
        : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

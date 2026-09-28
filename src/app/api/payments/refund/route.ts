import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, PaymentError } from '@/server/services';
import { PaymentRefundSchema } from '@/server/validators';
import { resolvePaymentOwnershipContext } from '@/lib/auth/payment';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const validationResult = PaymentRefundSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const ownershipContext = await resolvePaymentOwnershipContext(request);
    const result = await PaymentService.refundPayment(validationResult.data, ownershipContext);

    return NextResponse.json(
      {
        success: true,
        data: {
          success: true,
          alreadyRefunded: result.alreadyRefunded,
          bookingNumber: result.bookingNumber,
          status: result.status,
          paymentId: result.payment.id,
          refundId: result.refundId,
          refundAmount: typeof result.refundAmount === 'number' ? result.refundAmount.toFixed(2) : result.refundAmount,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof PaymentError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    console.error('[Payment API] refund unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

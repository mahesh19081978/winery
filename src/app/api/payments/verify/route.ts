import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, PaymentError } from '@/server/services';
import { PaymentVerifySchema } from '@/server/validators';
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

    const validationResult = PaymentVerifySchema.safeParse(body);
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
    const result = await PaymentService.verifyPayment(validationResult.data, ownershipContext);

    return NextResponse.json(
      {
        success: true,
        data: {
          success: true,
          alreadyProcessed: result.alreadyProcessed,
          bookingNumber: result.bookingNumber,
          status: result.status,
          paymentId: result.payment.id,
          providerOrderId: result.payment.providerOrderId,
          providerPaymentId: result.payment.providerPaymentId,
          amount: result.payment.amount.toFixed(2),
          currency: result.payment.currency,
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

    console.error('[Payment API] verify unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

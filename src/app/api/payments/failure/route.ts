import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, PaymentError } from '@/server/services';
import { PaymentFailureSchema } from '@/server/validators';
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

    const validationResult = PaymentFailureSchema.safeParse(body);
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
    const result = await PaymentService.recordPaymentFailure(validationResult.data, ownershipContext);

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: result.id,
          providerOrderId: result.providerOrderId,
          status: result.status,
          errorCode: result.errorCode ?? null,
          errorMessage: result.errorMessage ?? null,
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

    console.error('[Payment API] failure unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

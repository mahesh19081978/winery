import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, PaymentError } from '@/server/services';
import { PaymentBookingType } from '@/server/validators';
import { resolvePaymentOwnershipContext } from '@/lib/auth/payment';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await context.params;

    if (!bookingNumber || bookingNumber.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking number is required' },
        { status: 400 }
      );
    }

    const typeParam = request.nextUrl.searchParams.get('type') || 'EXPERIENCE';
    if (typeParam !== 'EXPERIENCE' && typeParam !== 'EVENT') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid booking type. Must be 'EXPERIENCE' or 'EVENT'",
        },
        { status: 400 }
      );
    }

    const bookingType = typeParam as PaymentBookingType;
    const ownershipContext = await resolvePaymentOwnershipContext(request);
    const payments = await PaymentService.getPaymentsForBooking(bookingType, bookingNumber, ownershipContext);

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      bookingNumber,
      bookingType,
      amount: p.amount.toFixed(2),
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      providerOrderId: p.providerOrderId,
      providerPaymentId: p.providerPaymentId,
      paymentMethod: p.paymentMethod,
      errorCode: p.errorCode ?? null,
      errorMessage: p.errorMessage ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ success: true, data: formattedPayments }, { status: 200 });
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

    console.error('[Payment API] getPayments unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/server/services';
import { verifyWebhookSignature } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    // 1. Extract raw text body for cryptographic signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    // 2. Timing-safe cryptographic signature validation (HMAC-SHA256)
    let isValid = false;
    try {
      isValid = verifyWebhookSignature({
        rawBody,
        signature,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook verification configuration error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    // 3. Parse JSON payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // 4. Extract event ID & type
    // Razorpay sends event id in payload.event_id or header x-razorpay-event-id
    const rawEventId =
      request.headers.get('x-razorpay-event-id') ||
      payload.event_id ||
      payload.id;

    const rawEventType = payload.event;

    if (typeof rawEventId !== 'string' || !rawEventId || typeof rawEventType !== 'string' || !rawEventType) {
      return NextResponse.json(
        { success: false, error: 'Missing event ID or event type in webhook payload' },
        { status: 400 }
      );
    }

    const eventPayload =
      payload.payload && typeof payload.payload === 'object'
        ? (payload.payload as Record<string, unknown>)
        : payload;

    // 5. Process event via PaymentService (idempotent, transactional)
    const result = await PaymentService.processWebhookEvent({
      eventId: rawEventId,
      eventType: rawEventType,
      payload: eventPayload,
    });

    return NextResponse.json(
      {
        success: true,
        received: true,
        handled: result.handled,
        alreadyProcessed: result.alreadyProcessed,
        reason: result.reason,
        status: result.status,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[POST /api/payments/webhook] Processing error:', error);
    const message = error instanceof Error ? error.message : 'Internal webhook processing error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

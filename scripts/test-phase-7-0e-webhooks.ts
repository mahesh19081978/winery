import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';
import { BookingService, EventBookingService } from '../src/server/services';
import { POST as createOrderRoute } from '../src/app/api/payments/create-order/route';
import { POST as webhookRoute } from '../src/app/api/payments/webhook/route';
import { GET as getPaymentsRoute } from '../src/app/api/payments/[bookingNumber]/route';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { getRazorpayClient } from '../src/lib/razorpay';
import crypto from 'crypto';

// Setup mock test environment variables for Razorpay
const TEST_KEY_ID = 'rzp_test_mock_e_key';
const TEST_KEY_SECRET = 'mock_secret_e_1234567890abcdef';
const TEST_WEBHOOK_SECRET = 'mock_webhook_secret_e_xyz987654321';
process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

// Helper to generate valid Webhook HMAC signature
function generateWebhookSignature(rawBody: string, secret = TEST_WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

// Helper to build NextRequest for webhook POST
function buildWebhookRequest(body: unknown, signatureHeader?: string, eventIdHeader?: string): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);

  if (signatureHeader !== undefined) {
    headers.set('x-razorpay-signature', signatureHeader);
  } else {
    headers.set('x-razorpay-signature', generateWebhookSignature(rawBody));
  }

  if (eventIdHeader) {
    headers.set('x-razorpay-event-id', eventIdHeader);
  }

  return new NextRequest(new URL('/api/payments/webhook', 'http://localhost:3000'), {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

function buildGetRequest(path: string, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method: 'GET',
    headers,
  });
}

async function parseResponse(res: Response) {
  const status = res.status;
  const json = await res.json();
  return { status, json };
}

async function runTests() {
  console.log('=== Phase 7.0E — Razorpay Webhooks & Payment Reconciliation Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Initial Database State Audit
  console.log('1. Auditing Initial Database State:');
  const initialBookings = await prisma.booking.count();
  const initialEventBookings = await prisma.eventBooking.count();
  const initialPaymentCount = await prisma.payment.count();
  const initialWebhookCount = await prisma.webhookEvent.count();

  assert(initialBookings === 17, `Initial Bookings count is exactly 17 (found: ${initialBookings})`);
  assert(initialEventBookings === 5, `Initial EventBookings count is exactly 5 (found: ${initialEventBookings})`);
  assert(initialPaymentCount === 0, `Initial Payments count is 0 (found: ${initialPaymentCount})`);
  assert(initialWebhookCount === 0, `Initial WebhookEvents count is 0 (found: ${initialWebhookCount})`);

  // Mock Razorpay Gateway Client orders.create
  const razorpayClient = getRazorpayClient();
  let gatewayCallCount = 0;
  (razorpayClient.orders as unknown as { create: (args: Record<string, unknown>) => Promise<unknown> }).create = async (
    args: Record<string, unknown>
  ) => {
    gatewayCallCount++;
    return {
      id: `order_rzp_mock_e_${Date.now()}_${gatewayCallCount}`,
      entity: 'order',
      amount: args.amount,
      amount_paid: 0,
      amount_due: args.amount,
      currency: args.currency,
      receipt: args.receipt,
      status: 'created',
      notes: args.notes,
    };
  };

  // Find prerequisites for test data creation
  const winery = await prisma.winery.findFirstOrThrow();
  const experience = await prisma.experience.findFirstOrThrow({
    where: { wineryId: winery.id, isActive: true },
  });
  const event = await prisma.event.findFirstOrThrow({
    where: {
      wineryId: winery.id,
      isPast: false,
      status: 'UPCOMING',
      ticketTypes: { some: { capacity: { gte: 10 } } },
    },
    include: { schedules: true, ticketTypes: true },
    orderBy: { createdAt: 'asc' },
  });
  const schedule = event.schedules[0];
  const ticketType = event.ticketTypes.find((t) => (t.capacity - t.soldCount) >= 4) ?? event.ticketTypes[0];

  // Track created entities for rigorous cleanup
  const createdGuestProfileIds: string[] = [];
  const createdBookingIds: string[] = [];
  const createdEventBookingIds: string[] = [];
  const createdWebhookEventIds: string[] = [];

  try {
    // 2. Webhook Signature Validation Security
    console.log('\n2. Webhook Signature Security Verification:');
    const dummyPayload = {
      event: 'payment.captured',
      id: 'evt_test_sec_01',
      created_at: 1700000000,
      payload: {
        payment: {
          entity: {
            id: 'pay_test_01',
            order_id: 'order_test_01',
            amount: 10000,
            status: 'captured',
          },
        },
      },
    };

    // Missing signature header
    const reqMissingSig = new NextRequest(new URL('/api/payments/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dummyPayload),
    });
    const resMissingSig = await parseResponse(await webhookRoute(reqMissingSig));
    assert(resMissingSig.status === 400, 'Rejects request missing x-razorpay-signature header with HTTP 400');
    assert(resMissingSig.json.error?.includes('signature'), 'Error message identifies missing signature');

    // Invalid / forged signature
    const reqInvalidSig = buildWebhookRequest(dummyPayload, 'bad_forged_hex_signature_1234567890abcdef');
    const resInvalidSig = await parseResponse(await webhookRoute(reqInvalidSig));
    assert(resInvalidSig.status === 400, 'Rejects forged webhook signature with HTTP 400');
    assert(resInvalidSig.json.error === 'Invalid webhook signature', 'Error message specifies Invalid webhook signature');

    // Malformed JSON with valid signature
    const malformedText = '{ invalid_json: ';
    const reqMalformed = new NextRequest(new URL('/api/payments/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': generateWebhookSignature(malformedText),
      },
      body: malformedText,
    });
    const resMalformed = await parseResponse(await webhookRoute(reqMalformed));
    assert(resMalformed.status === 400, 'Rejects malformed JSON with HTTP 400');
    assert(resMalformed.json.error?.includes('JSON'), 'Error identifies invalid JSON');

    // 3. Webhook Reconciliation for Experience Booking (payment.captured)
    console.log('\n3. Experience Booking Webhook Reconciliation (payment.captured):');
    const expBooking = await BookingService.createBooking({
      experienceSlug: experience.slug,
      date: '2026-11-20',
      time: '14:00',
      adults: 2,
      children: 0,
      guestName: 'Webhook Test User',
      guestEmail: 'webhook.exp@vinoratest.com',
      guestPhone: '+1-555-0199',
      paymentMethod: 'ONLINE',
    });
    createdBookingIds.push(expBooking.id);
    createdGuestProfileIds.push(expBooking.guestProfileId);

    assert(expBooking.status === BookingStatus.PENDING, 'Experience booking created with status PENDING');

    // Create payment order
    const orderRes = await parseResponse(
      await createOrderRoute(
        new NextRequest(new URL('/api/payments/create-order', 'http://localhost:3000'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingType: 'EXPERIENCE', bookingNumber: expBooking.bookingNumber }),
        })
      )
    );
    assert(orderRes.status === 200, 'Order created successfully for webhook testing');
    const expOrderId = orderRes.json.data.orderId;
    const expPaymentId = 'pay_wh_captured_exp_999';
    const whEventId1 = `evt_exp_cap_${Date.now()}`;
    createdWebhookEventIds.push(whEventId1);

    const expCapturedWebhookPayload = {
      event: 'payment.captured',
      event_id: whEventId1,
      payload: {
        payment: {
          entity: {
            id: expPaymentId,
            order_id: expOrderId,
            amount: orderRes.json.data.amountSubunits,
            currency: 'USD',
            status: 'captured',
            method: 'card',
          },
        },
      },
    };

    const reqWh1 = buildWebhookRequest(expCapturedWebhookPayload, undefined, whEventId1);
    const resWh1 = await parseResponse(await webhookRoute(reqWh1));
    assert(resWh1.status === 200, 'POST /api/payments/webhook returns HTTP 200 for valid payment.captured');
    assert(resWh1.json.handled === true, 'Webhook marked as handled');
    assert(resWh1.json.alreadyProcessed === false, 'Webhook not previously processed');
    assert(resWh1.json.status === 'PAID', 'Response confirms payment status is PAID');

    // Verify DB state
    const dbExpBooking = await prisma.booking.findUniqueOrThrow({ where: { id: expBooking.id } });
    assert(dbExpBooking.status === BookingStatus.CONFIRMED, 'Experience booking transitioned to CONFIRMED via webhook');

    const dbExpPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: expOrderId } });
    assert(dbExpPayment.status === PaymentStatus.PAID, 'Payment record transitioned to PAID');
    assert(dbExpPayment.providerPaymentId === expPaymentId, 'Payment record stores providerPaymentId from webhook');

    const expStatusHistory = await prisma.bookingStatusHistory.findFirst({
      where: { bookingId: expBooking.id, toStatus: BookingStatus.CONFIRMED },
    });
    assert(Boolean(expStatusHistory), 'Status history recorded for booking');
    assert(expStatusHistory?.changedBy === 'PAYMENT_VERIFIED', 'Status history changedBy is PAYMENT_VERIFIED');

    // 4. Webhook Event Idempotency (Same Webhook Event Replayed)
    console.log('\n4. Webhook Idempotency Verification:');
    const reqWh1Duplicate = buildWebhookRequest(expCapturedWebhookPayload, undefined, whEventId1);
    const resWh1Duplicate = await parseResponse(await webhookRoute(reqWh1Duplicate));
    assert(resWh1Duplicate.status === 200, 'Duplicate webhook returns HTTP 200');
    assert(resWh1Duplicate.json.alreadyProcessed === true, 'Duplicate webhook identified as alreadyProcessed: true');
    assert(resWh1Duplicate.json.reason === 'Event already processed', 'Reports correct idempotency reason');

    const totalExpPayments = await prisma.payment.count({ where: { bookingId: expBooking.id } });
    assert(totalExpPayments === 1, 'Exactly 1 Payment record exists after duplicate webhook delivery');

    // 5. Webhook Reconciliation for Event Booking (order.paid)
    console.log('\n5. Event Booking Webhook Reconciliation (order.paid):');
    const evtBooking = await EventBookingService.createBooking({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: 'Webhook Event User',
      guestEmail: 'webhook.evt@vinoratest.com',
      guestPhone: '+1-555-0188',
      paymentMethod: 'ONLINE',
      tickets: [{ eventTicketTypeId: ticketType.id, quantity: 1 }],
    });
    createdEventBookingIds.push(evtBooking.id);
    createdGuestProfileIds.push(evtBooking.guestProfileId);

    assert(evtBooking.status === BookingStatus.PENDING, 'Event booking created with status PENDING');

    const evtOrderRes = await parseResponse(
      await createOrderRoute(
        new NextRequest(new URL('/api/payments/create-order', 'http://localhost:3000'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingType: 'EVENT', bookingNumber: evtBooking.bookingNumber }),
        })
      )
    );
    assert(evtOrderRes.status === 200, 'Order created successfully for event booking');
    const evtOrderId = evtOrderRes.json.data.orderId;
    const evtPaymentId = 'pay_wh_paid_evt_888';
    const whEventId2 = `evt_evt_paid_${Date.now()}`;
    createdWebhookEventIds.push(whEventId2);

    const evtPaidWebhookPayload = {
      event: 'order.paid',
      id: whEventId2,
      payload: {
        order: {
          entity: {
            id: evtOrderId,
            amount: evtOrderRes.json.data.amountSubunits,
            amount_paid: evtOrderRes.json.data.amountSubunits,
            status: 'paid',
          },
        },
        payment: {
          entity: {
            id: evtPaymentId,
            order_id: evtOrderId,
            amount: evtOrderRes.json.data.amountSubunits,
            status: 'captured',
            method: 'upi',
          },
        },
      },
    };

    const reqWh2 = buildWebhookRequest(evtPaidWebhookPayload, undefined, whEventId2);
    const resWh2 = await parseResponse(await webhookRoute(reqWh2));
    assert(resWh2.status === 200, 'POST /api/payments/webhook returns HTTP 200 for order.paid');
    assert(resWh2.json.handled === true, 'Event webhook handled successfully');
    assert(resWh2.json.status === 'PAID', 'Response status is PAID');

    const dbEvtBooking = await prisma.eventBooking.findUniqueOrThrow({ where: { id: evtBooking.id } });
    assert(dbEvtBooking.status === BookingStatus.CONFIRMED, 'Event booking transitioned to CONFIRMED via webhook');

    const dbEvtPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: evtOrderId } });
    assert(dbEvtPayment.status === PaymentStatus.PAID, 'Event payment transitioned to PAID');
    assert(dbEvtPayment.providerPaymentId === evtPaymentId, 'Event payment stores providerPaymentId');

    const evtStatusHistory = await prisma.eventBookingStatusHistory.findFirst({
      where: { eventBookingId: evtBooking.id, toStatus: BookingStatus.CONFIRMED },
    });
    assert(Boolean(evtStatusHistory), 'Event booking status history created');
    assert(evtStatusHistory?.changedBy === 'PAYMENT_VERIFIED', 'Event status history changedBy is PAYMENT_VERIFIED');

    // 6. Payment Failure Webhook (payment.failed)
    console.log('\n6. Payment Failure Webhook (payment.failed):');
    const failedExpBooking = await BookingService.createBooking({
      experienceSlug: experience.slug,
      date: '2026-11-21',
      time: '15:00',
      adults: 2,
      children: 0,
      guestName: 'Webhook Failure User',
      guestEmail: 'webhook.fail@vinoratest.com',
      guestPhone: '+1-555-0177',
      paymentMethod: 'ONLINE',
    });
    createdBookingIds.push(failedExpBooking.id);
    createdGuestProfileIds.push(failedExpBooking.guestProfileId);

    const failOrderRes = await parseResponse(
      await createOrderRoute(
        new NextRequest(new URL('/api/payments/create-order', 'http://localhost:3000'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingType: 'EXPERIENCE', bookingNumber: failedExpBooking.bookingNumber }),
        })
      )
    );
    const failOrderId = failOrderRes.json.data.orderId;
    const whEventId3 = `evt_fail_${Date.now()}`;
    createdWebhookEventIds.push(whEventId3);

    const failureWebhookPayload = {
      event: 'payment.failed',
      id: whEventId3,
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_webhook_777',
            order_id: failOrderId,
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Payment was declined by issuing bank',
          },
        },
      },
    };

    const reqWh3 = buildWebhookRequest(failureWebhookPayload, undefined, whEventId3);
    const resWh3 = await parseResponse(await webhookRoute(reqWh3));
    assert(resWh3.status === 200, 'payment.failed webhook returns HTTP 200');
    assert(resWh3.json.status === 'FAILED', 'Webhook response indicates FAILED status');

    const dbFailPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: failOrderId } });
    assert(dbFailPayment.status === PaymentStatus.FAILED, 'Payment record transitioned to FAILED');
    assert(dbFailPayment.errorCode === 'BAD_REQUEST_ERROR', 'Payment record stores failure errorCode');

    // Crucial: reservation remains PENDING for retry
    const dbFailBooking = await prisma.booking.findUniqueOrThrow({ where: { id: failedExpBooking.id } });
    assert(dbFailBooking.status === BookingStatus.PENDING, 'Reservation remains PENDING after payment.failed webhook');

    // 7. Unknown / Unhandled Webhook Events
    console.log('\n7. Handling Unknown and Unhandled Webhook Events:');
    const whEventId4 = `evt_refund_${Date.now()}`;
    createdWebhookEventIds.push(whEventId4);

    const unhandledPayload = {
      event: 'refund.processed',
      id: whEventId4,
      payload: {
        refund: { entity: { id: 'rfnd_001', amount: 5000 } },
      },
    };

    const reqWh4 = buildWebhookRequest(unhandledPayload, undefined, whEventId4);
    const resWh4 = await parseResponse(await webhookRoute(reqWh4));
    assert(resWh4.status === 200, 'Unhandled event returns HTTP 200 acknowledging receipt');
    assert(resWh4.json.handled === false, 'Response indicates handled: false');
    assert(resWh4.json.reason?.includes('Ignored event type'), 'Response notes event was ignored');

    const dbWebhookRecord = await prisma.webhookEvent.findUnique({ where: { eventId: whEventId4 } });
    assert(Boolean(dbWebhookRecord), 'WebhookEvent record stored in database for audit trail');
    assert(dbWebhookRecord?.processed === true, 'WebhookEvent record marked as processed: true');

    // 8. Reconciled Reservation Query via Payment Status API
    console.log('\n8. Payment Status API Visibility for Reconciled Reservations:');
    const getRes = await parseResponse(
      await getPaymentsRoute(buildGetRequest(`/api/payments/${expBooking.bookingNumber}?type=EXPERIENCE`), {
        params: Promise.resolve({ bookingNumber: expBooking.bookingNumber }),
      })
    );
    assert(getRes.status === 200, 'GET /api/payments/[bookingNumber] returns HTTP 200');
    assert(Array.isArray(getRes.json.data), 'Returns payments array');
    assert(getRes.json.data.length >= 1, 'Contains at least one payment record');
    assert(getRes.json.data[0].status === 'PAID', 'First payment record is marked PAID');
    assert(getRes.json.data[0].providerPaymentId === expPaymentId, 'First payment record has providerPaymentId');
    assert(getRes.json.data[0].providerSignature === undefined, 'Does NOT leak providerSignature');
    assert(getRes.json.data[0].idempotencyKey === undefined, 'Does NOT leak idempotencyKey');
  } finally {
    // 9. Strict Database Cleanup
    console.log('\n9. Performing Strict Database Cleanup:');

    // Delete webhook event records
    if (createdWebhookEventIds.length > 0) {
      await prisma.webhookEvent.deleteMany({
        where: { eventId: { in: createdWebhookEventIds } },
      });
    }

    // Delete notifications generated during test
    await prisma.notification.deleteMany({
      where: {
        recipient: { in: ['webhook.exp@vinoratest.com', 'webhook.evt@vinoratest.com', 'webhook.fail@vinoratest.com'] },
      },
    });

    // Delete test payments
    await prisma.payment.deleteMany({
      where: {
        OR: [
          { bookingId: { in: createdBookingIds } },
          { eventBookingId: { in: createdEventBookingIds } },
        ],
      },
    });

    // Delete status histories
    await prisma.bookingStatusHistory.deleteMany({
      where: { bookingId: { in: createdBookingIds } },
    });
    await prisma.eventBookingStatusHistory.deleteMany({
      where: { eventBookingId: { in: createdEventBookingIds } },
    });

    // Delete booking items & bookings
    await prisma.bookingItem.deleteMany({
      where: { bookingId: { in: createdBookingIds } },
    });
    await prisma.booking.deleteMany({
      where: { id: { in: createdBookingIds } },
    });

    // Delete event booking tickets & event bookings
    await prisma.eventBookingTicket.deleteMany({
      where: { eventBookingId: { in: createdEventBookingIds } },
    });
    await prisma.eventBooking.deleteMany({
      where: { id: { in: createdEventBookingIds } },
    });

    // Delete guest profiles & users created during test
    if (createdGuestProfileIds.length > 0) {
      const profiles = await prisma.guestProfile.findMany({
        where: { id: { in: createdGuestProfileIds } },
        select: { userId: true },
      });
      const userIds = profiles.map((p) => p.userId).filter(Boolean) as string[];

      await prisma.guestProfile.deleteMany({
        where: { id: { in: createdGuestProfileIds } },
      });
      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    }

    // Final Database Integrity Audit
    const finalBookings = await prisma.booking.count();
    const finalEventBookings = await prisma.eventBooking.count();
    const finalPayments = await prisma.payment.count();
    const finalWebhooks = await prisma.webhookEvent.count();

    assert(finalBookings === 17, `Final Bookings count is exactly 17 (found: ${finalBookings})`);
    assert(finalEventBookings === 5, `Final EventBookings count is exactly 5 (found: ${finalEventBookings})`);
    assert(finalPayments === 0, `Final Payments count is exactly 0 (found: ${finalPayments})`);
    assert(finalWebhooks === 0, `Final WebhookEvents count is exactly 0 (found: ${finalWebhooks})`);
  }

  console.log(`\n=== Phase 7.0E Test Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

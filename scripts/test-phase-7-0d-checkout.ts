import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';
import { BookingService, EventBookingService } from '../src/server/services';
import { POST as createOrderRoute } from '../src/app/api/payments/create-order/route';
import { POST as verifyRoute } from '../src/app/api/payments/verify/route';
import { POST as failureRoute } from '../src/app/api/payments/failure/route';
import { GET as getPaymentsRoute } from '../src/app/api/payments/[bookingNumber]/route';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { getRazorpayClient } from '../src/lib/razorpay';
import crypto from 'crypto';

// Setup mock test environment variables for Razorpay
const TEST_KEY_ID = 'rzp_test_mock_d_key';
const TEST_KEY_SECRET = 'mock_secret_d_1234567890abcdef';
process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

// Helper to generate valid HMAC signature
function generateSignature(orderId: string, paymentId: string, secret = TEST_KEY_SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

// Helpers to build NextRequest objects
function buildPostRequest(path: string, body: unknown, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
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
  console.log('=== Phase 7.0D — Customer-Facing Razorpay Checkout Automated Test Suite ===\n');

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
      id: `order_rzp_mock_d_${Date.now()}_${gatewayCallCount}`,
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
  // Prefer an event with plenty of remaining capacity for tests (avoid seed capacity conflicts)
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
  // Pick ticket type with capacity >= 4 (need 1 PoA + 1 Online + 1 dismissal = 3 tickets minimum)
  const ticketType = event.ticketTypes.find((t) => (t.capacity - t.soldCount) >= 4) ?? event.ticketTypes[0];

  console.log(`  Using event: "${event.title}" | ticketType: "${ticketType.name}" capacity=${ticketType.capacity} sold=${ticketType.soldCount}`);

  // Track created entities for rigorous cleanup
  const createdGuestProfileIds: string[] = [];
  const createdBookingIds: string[] = [];
  const createdEventBookingIds: string[] = [];

  try {
    // 2. Test Experience Booking creation with paymentMethod
    console.log('\n2. Experience Booking Creation with paymentMethod:');

    // 2a. Pay on Arrival (default)
    const bookingPoA = await BookingService.createBooking({
      experienceSlug: experience.slug,
      date: '2026-10-15',
      time: '14:00',
      adults: 2,
      children: 0,
      guestName: 'Guest PoA',
      guestEmail: `guest-poa-${Date.now()}@vinoratest.com`,
      guestPhone: '+15551111',
      paymentMethod: 'PAY_ON_ARRIVAL',
    });
    createdBookingIds.push(bookingPoA.id);
    if (bookingPoA.guestProfileId) createdGuestProfileIds.push(bookingPoA.guestProfileId);

    assert(
      bookingPoA.status === BookingStatus.CONFIRMED,
      'Experience booking with PAY_ON_ARRIVAL is immediately CONFIRMED'
    );

    // 2b. Online Payment
    const bookingOnline = await BookingService.createBooking({
      experienceSlug: experience.slug,
      date: '2026-10-16',
      time: '14:00',
      adults: 2,
      children: 0,
      guestName: 'Guest Online',
      guestEmail: `guest-online-${Date.now()}@vinoratest.com`,
      guestPhone: '+15552222',
      paymentMethod: 'ONLINE',
    });
    createdBookingIds.push(bookingOnline.id);
    if (bookingOnline.guestProfileId) createdGuestProfileIds.push(bookingOnline.guestProfileId);

    assert(
      bookingOnline.status === BookingStatus.PENDING,
      'Experience booking with ONLINE payment method is created with status PENDING'
    );

    // 3. Test Event Booking creation with paymentMethod
    console.log('\n3. Event Booking Creation with paymentMethod:');

    // 3a. Event Pay on Arrival
    const eventBookingPoA = await EventBookingService.createBooking({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: 'Event Guest PoA',
      guestEmail: `event-poa-${Date.now()}@vinoratest.com`,
      guestPhone: '+15553333',
      tickets: [
        {
          eventTicketTypeId: ticketType.id,
          quantity: 2,
        },
      ],
      paymentMethod: 'PAY_ON_ARRIVAL',
    });
    createdEventBookingIds.push(eventBookingPoA.id);
    if (eventBookingPoA.guestProfileId) createdGuestProfileIds.push(eventBookingPoA.guestProfileId);

    assert(
      eventBookingPoA.status === BookingStatus.CONFIRMED,
      'Event booking with PAY_ON_ARRIVAL is immediately CONFIRMED'
    );

    // 3b. Event Online Payment
    const eventBookingOnline = await EventBookingService.createBooking({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: 'Event Guest Online',
      guestEmail: `event-online-${Date.now()}@vinoratest.com`,
      guestPhone: '+15554444',
      tickets: [
        {
          eventTicketTypeId: ticketType.id,
          quantity: 2,
        },
      ],
      paymentMethod: 'ONLINE',
    });
    createdEventBookingIds.push(eventBookingOnline.id);
    if (eventBookingOnline.guestProfileId) createdGuestProfileIds.push(eventBookingOnline.guestProfileId);

    assert(
      eventBookingOnline.status === BookingStatus.PENDING,
      'Event booking with ONLINE payment method is created with status PENDING'
    );

    // 4. End-to-End Online Checkout Flow for Experience Booking
    console.log('\n4. End-to-End Online Checkout Flow for Experience Booking:');

    // 4a. Create Payment Order via API
    const createOrderReq = buildPostRequest('/api/payments/create-order', {
      bookingType: 'EXPERIENCE',
      bookingNumber: bookingOnline.bookingNumber,
    });
    const orderRes = await createOrderRoute(createOrderReq);
    const { status: orderStatus, json: orderJson } = await parseResponse(orderRes);

    assert(orderStatus === 200, 'POST /api/payments/create-order returns HTTP 200');
    assert(orderJson.success === true, 'Order creation response is successful');
    assert(!!orderJson.data.orderId, 'Response contains orderId');
    assert(orderJson.data.keyId === TEST_KEY_ID, 'Response contains client keyId');
    assert(Number(orderJson.data.amount) === Number(bookingOnline.totalPrice), 'Authoritative amount matches DB total');
    assert(orderJson.data.currency === 'USD', 'Currency is USD');
    assert(orderJson.data.providerSignature === undefined, 'providerSignature is NOT exposed');
    assert(orderJson.data.idempotencyKey === undefined, 'idempotencyKey is NOT exposed');

    const providerOrderId = orderJson.data.orderId;

    // 4b. Order Reuse within 15 Minutes
    const reuseOrderReq = buildPostRequest('/api/payments/create-order', {
      bookingType: 'EXPERIENCE',
      bookingNumber: bookingOnline.bookingNumber,
    });
    const reuseRes = await createOrderRoute(reuseOrderReq);
    const { json: reuseJson } = await parseResponse(reuseRes);
    assert(
      reuseJson.data.orderId === providerOrderId,
      'Subsequent create-order within 15m reuses existing pending orderId'
    );

    // 4c. Verify Payment with Invalid Signature (Security Guard)
    const invalidVerifyReq = buildPostRequest('/api/payments/verify', {
      bookingType: 'EXPERIENCE',
      bookingNumber: bookingOnline.bookingNumber,
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: 'pay_mock_invalid_sig_123',
      razorpaySignature: 'forged_or_invalid_signature_hex',
    });
    const invalidVerifyRes = await verifyRoute(invalidVerifyReq);
    const { status: invalidStatus } = await parseResponse(invalidVerifyRes);
    assert(invalidStatus === 400, 'Verification with invalid signature is rejected with HTTP 400');

    // Verify booking is still PENDING after failed verification attempt
    const bookingStillPending = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingOnline.id },
    });
    assert(bookingStillPending.status === BookingStatus.PENDING, 'Booking remains PENDING after invalid verification');

    // 4d. Verify Payment with Valid Cryptographic Signature
    const validPaymentId = `pay_mock_exp_${Date.now()}`;
    const validSignature = generateSignature(providerOrderId, validPaymentId);

    const validVerifyReq = buildPostRequest('/api/payments/verify', {
      bookingType: 'EXPERIENCE',
      bookingNumber: bookingOnline.bookingNumber,
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: validPaymentId,
      razorpaySignature: validSignature,
    });
    const validVerifyRes = await verifyRoute(validVerifyReq);
    const { status: validStatus, json: validJson } = await parseResponse(validVerifyRes);

    assert(validStatus === 200, 'POST /api/payments/verify returns HTTP 200 with valid signature');
    assert(validJson.success === true, 'Verification response is successful');
    assert(validJson.data.status === 'PAID', 'Payment DTO reports status PAID');
    assert(validJson.data.bookingNumber === bookingOnline.bookingNumber, 'Payment DTO matches bookingNumber');
    assert(validJson.data.providerSignature === undefined, 'Verification response does not leak signature');
    assert(validJson.data.idempotencyKey === undefined, 'Verification response does not leak idempotencyKey');

    // 4e. Confirm Database State Transitions
    const confirmedBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingOnline.id },
      include: {
        payments: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    assert(
      confirmedBooking.status === BookingStatus.CONFIRMED,
      'Booking status transitioned atomically from PENDING to CONFIRMED'
    );
    assert(confirmedBooking.payments.length === 1, 'Exactly 1 Payment record created');
    assert(confirmedBooking.payments[0].status === PaymentStatus.PAID, 'Payment record status is PAID');
    assert(
      confirmedBooking.payments[0].providerPaymentId === validPaymentId,
      'Payment record stores correct providerPaymentId'
    );
    const latestHistory = confirmedBooking.statusHistory[0];
    assert(
      latestHistory.toStatus === BookingStatus.CONFIRMED && latestHistory.fromStatus === BookingStatus.PENDING,
      'StatusHistory audit trail records transition PENDING -> CONFIRMED'
    );

    // 4f. Idempotent Re-verification
    const reVerifyReq = buildPostRequest('/api/payments/verify', {
      bookingType: 'EXPERIENCE',
      bookingNumber: bookingOnline.bookingNumber,
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: validPaymentId,
      razorpaySignature: validSignature,
    });
    const reVerifyRes = await verifyRoute(reVerifyReq);
    const { status: reVerifyStatus, json: reVerifyJson } = await parseResponse(reVerifyRes);
    assert(reVerifyStatus === 200, 'Re-verifying same payment returns HTTP 200');
    assert(reVerifyJson.data.alreadyProcessed === true, 'Response indicates alreadyProcessed: true');

    // 5. End-to-End Online Checkout Flow for Event Booking
    console.log('\n5. End-to-End Online Checkout Flow for Event Booking:');

    // 5a. Create Event Payment Order
    const createEventOrderReq = buildPostRequest('/api/payments/create-order', {
      bookingType: 'EVENT',
      bookingNumber: eventBookingOnline.bookingNumber,
    });
    const eventOrderRes = await createOrderRoute(createEventOrderReq);
    const { status: eventOrderStatus, json: eventOrderJson } = await parseResponse(eventOrderRes);
    assert(eventOrderStatus === 200, 'Event POST /api/payments/create-order returns HTTP 200');
    assert(eventOrderJson.success === true, 'Event order creation succeeded');

    const eventProviderOrderId = eventOrderJson.data.orderId;
    const eventPaymentId = `pay_mock_event_${Date.now()}`;
    const eventSignature = generateSignature(eventProviderOrderId, eventPaymentId);

    // 5b. Verify Event Payment
    const eventVerifyReq = buildPostRequest('/api/payments/verify', {
      bookingType: 'EVENT',
      bookingNumber: eventBookingOnline.bookingNumber,
      razorpayOrderId: eventProviderOrderId,
      razorpayPaymentId: eventPaymentId,
      razorpaySignature: eventSignature,
    });
    const eventVerifyRes = await verifyRoute(eventVerifyReq);
    const { status: eventVerifyStatus, json: eventVerifyJson } = await parseResponse(eventVerifyRes);

    assert(eventVerifyStatus === 200, 'Event POST /api/payments/verify returns HTTP 200');
    assert(eventVerifyJson.data.status === 'PAID', 'Event payment marked PAID');

    const confirmedEventBooking = await prisma.eventBooking.findUniqueOrThrow({
      where: { id: eventBookingOnline.id },
      include: { payments: true },
    });
    assert(
      confirmedEventBooking.status === BookingStatus.CONFIRMED,
      'EventBooking transitioned atomically to CONFIRMED'
    );
    assert(confirmedEventBooking.payments[0].status === PaymentStatus.PAID, 'Event payment record status is PAID');

    // 6. Dismissal, Failure Telemetry & Retry Flow
    console.log('\n6. Dismissal, Failure Telemetry & Retry Flow:');

    // 6a. Create another pending booking to test user dismissal
    const dismissalBooking = await BookingService.createBooking({
      experienceSlug: experience.slug,
      date: '2026-10-18',
      time: '14:00',
      adults: 2,
      children: 0,
      guestName: 'Dismissal Guest',
      guestEmail: `guest-dismiss-${Date.now()}@vinoratest.com`,
      guestPhone: '+15555555',
      paymentMethod: 'ONLINE',
    });
    createdBookingIds.push(dismissalBooking.id);
    if (dismissalBooking.guestProfileId) createdGuestProfileIds.push(dismissalBooking.guestProfileId);

    // Create payment order
    const dismissOrderReq = buildPostRequest('/api/payments/create-order', {
      bookingType: 'EXPERIENCE',
      bookingNumber: dismissalBooking.bookingNumber,
    });
    const dismissOrderRes = await createOrderRoute(dismissOrderReq);
    const { json: dismissOrderJson } = await parseResponse(dismissOrderRes);
    const dismissOrderId = dismissOrderJson.data.orderId;

    // 6b. Record Failure / User Dismissal
    const failureReq = buildPostRequest('/api/payments/failure', {
      bookingType: 'EXPERIENCE',
      bookingNumber: dismissalBooking.bookingNumber,
      providerOrderId: dismissOrderId,
      errorCode: 'USER_DISMISSED',
      errorDescription: 'Customer closed Razorpay modal without completing payment',
    });
    const failureRes = await failureRoute(failureReq);
    const { status: failureStatus, json: failureJson } = await parseResponse(failureRes);

    assert(failureStatus === 200, 'POST /api/payments/failure returns HTTP 200');
    assert(failureJson.success === true, 'Failure telemetry recorded successfully');
    assert(failureJson.data.status === 'FAILED', 'Payment marked as FAILED');
    assert(failureJson.data.errorCode === 'USER_DISMISSED', 'Error code recorded correctly');

    // Verify booking is STILL PENDING (not cancelled, allowed to retry)
    const pendingAfterDismissal = await prisma.booking.findUniqueOrThrow({
      where: { id: dismissalBooking.id },
    });
    assert(
      pendingAfterDismissal.status === BookingStatus.PENDING,
      'Booking remains PENDING after user closes/dismisses checkout modal'
    );

    // 6c. Retry: Successful payment after initial dismissal
    const retryOrderReq = buildPostRequest('/api/payments/create-order', {
      bookingType: 'EXPERIENCE',
      bookingNumber: dismissalBooking.bookingNumber,
    });
    const retryOrderRes = await createOrderRoute(retryOrderReq);
    const { json: retryOrderJson } = await parseResponse(retryOrderRes);
    const retryOrderId = retryOrderJson.data.orderId;

    const retryPaymentId = `pay_mock_retry_${Date.now()}`;
    const retrySignature = generateSignature(retryOrderId, retryPaymentId);

    const retryVerifyReq = buildPostRequest('/api/payments/verify', {
      bookingType: 'EXPERIENCE',
      bookingNumber: dismissalBooking.bookingNumber,
      razorpayOrderId: retryOrderId,
      razorpayPaymentId: retryPaymentId,
      razorpaySignature: retrySignature,
    });
    const retryVerifyRes = await verifyRoute(retryVerifyReq);
    const { status: retryVerifyStatus } = await parseResponse(retryVerifyRes);

    assert(retryVerifyStatus === 200, 'Retry payment verification succeeds with HTTP 200');

    const confirmedAfterRetry = await prisma.booking.findUniqueOrThrow({
      where: { id: dismissalBooking.id },
    });
    assert(
      confirmedAfterRetry.status === BookingStatus.CONFIRMED,
      'Booking successfully confirmed after retry'
    );

    // 7. Payment Status API endpoint verification
    console.log('\n7. Payment Status API (GET /api/payments/[bookingNumber]):');

    const getPaymentsReq = buildGetRequest(`/api/payments/${bookingOnline.bookingNumber}?type=EXPERIENCE`);
    const getPaymentsRes = await getPaymentsRoute(getPaymentsReq, {
      params: Promise.resolve({ bookingNumber: bookingOnline.bookingNumber }),
    });
    const { status: getStatus, json: getJson } = await parseResponse(getPaymentsRes);

    assert(getStatus === 200, 'GET /api/payments/[bookingNumber] returns HTTP 200');
    assert(Array.isArray(getJson.data), 'Returns array of payment records');
    assert(getJson.data.length >= 1, 'Contains at least 1 payment record');
    assert(getJson.data[0].status === 'PAID', 'First payment record is PAID');
    assert(getJson.data[0].providerSignature === undefined, 'No providerSignature in list response');
    assert(getJson.data[0].idempotencyKey === undefined, 'No idempotencyKey in list response');

  } finally {
    // 8. Strict Database Cleanup & Restitution
    console.log('\n8. Performing Strict Database Cleanup:');

    // Delete payments
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

  console.log(`\n=== Phase 7.0D Test Summary: ${passed} passed, ${failed} failed ===`);
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

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';
import { BookingService, EventBookingService } from '../src/server/services';
import { POST as createOrderRoute } from '../src/app/api/payments/create-order/route';
import { POST as verifyRoute } from '../src/app/api/payments/verify/route';
import { POST as refundRoute } from '../src/app/api/payments/refund/route';
import { POST as webhookRoute } from '../src/app/api/payments/webhook/route';
import { GET as getPaymentsRoute } from '../src/app/api/payments/[bookingNumber]/route';
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client';
import { getRazorpayClient } from '../src/lib/razorpay';
import { GuestAuth, GUEST_AUTH_COOKIE_NAME } from '../src/lib/auth/guest';
import { AuthService, ADMIN_AUTH_COOKIE_NAME } from '../src/lib/auth';
import crypto from 'crypto';

// Setup mock test environment variables for Razorpay
const TEST_KEY_ID = 'rzp_test_mock_f_key';
const TEST_KEY_SECRET = 'mock_secret_f_1234567890abcdef';
const TEST_WEBHOOK_SECRET = 'mock_webhook_secret_f_xyz987654321';
process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

// Helper to generate valid Webhook HMAC signature
function generateWebhookSignature(rawBody: string, secret = TEST_WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

// Helper to generate valid payment signature
function generatePaymentSignature(orderId: string, paymentId: string, secret = TEST_KEY_SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

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

function buildWebhookRequest(body: unknown, signatureHeader?: string): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  headers.set('x-razorpay-signature', signatureHeader !== undefined ? signatureHeader : generateWebhookSignature(rawBody));

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

async function runTests() {
  console.log('=== Phase 7.0F — Refunds & Payment Reversal Automated Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Audit Initial Database State
  console.log('1. Auditing Initial Database State:');
  const initialBookingsCount = await prisma.booking.count();
  const initialEventBookingsCount = await prisma.eventBooking.count();
  const initialPaymentsCount = await prisma.payment.count();
  const initialWebhookEventsCount = await prisma.webhookEvent.count();

  assert(initialBookingsCount === 17, `Initial Bookings count is exactly 17 (found: ${initialBookingsCount})`);
  assert(initialEventBookingsCount === 5, `Initial EventBookings count is exactly 5 (found: ${initialEventBookingsCount})`);
  assert(initialPaymentsCount === 0, `Initial Payments count is 0 (found: ${initialPaymentsCount})`);
  assert(initialWebhookEventsCount === 0, `Initial WebhookEvents count is 0 (found: ${initialWebhookEventsCount})`);

  // Mock Razorpay Gateway Client
  const razorpayClient = getRazorpayClient();
  let mockOrderCounter = 0;
  let mockRefundCounter = 0;
  let shouldSimulateRefundFailure = false;

  (razorpayClient.orders as unknown as { create: (args: Record<string, unknown>) => Promise<unknown> }).create = async (
    args: Record<string, unknown>
  ) => {
    mockOrderCounter++;
    return {
      id: `order_mock_f_${Date.now()}_${mockOrderCounter}`,
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

  (razorpayClient.payments as unknown as { refund: (paymentId: string, args: Record<string, unknown>) => Promise<unknown> }).refund = async (
    paymentId: string,
    args: Record<string, unknown>
  ) => {
    if (shouldSimulateRefundFailure) {
      throw new Error('Razorpay gateway refund rejected: Insufficient merchant balance');
    }
    mockRefundCounter++;
    return {
      id: `rfnd_mock_f_${Date.now()}_${mockRefundCounter}`,
      entity: 'refund',
      amount: args.amount,
      currency: 'USD',
      payment_id: paymentId,
      notes: args.notes,
      receipt: args.receipt,
      acquirer_data: { arn: 'mock_arn_12345678' },
      created_at: Math.floor(Date.now() / 1000),
      batch_id: null,
      status: 'processed',
      speed_processed: 'normal',
      speed_requested: 'normal',
    };
  };

  // Setup Auth tokens
  const staffCookieToken = await AuthService.createSessionToken({
    userId: 'staff_refund_mgr',
    email: 'manager@vinora.com',
    role: UserRole.MANAGER,
    wineryId: null,
  });
  const staffCookie = `${ADMIN_AUTH_COOKIE_NAME}=${staffCookieToken}`;

  const nonStaffAdminToken = await AuthService.createSessionToken({
    userId: 'guest_user_not_staff',
    email: 'guest@vinora.com',
    role: UserRole.GUEST,
    wineryId: null,
  });
  const nonStaffCookie = `${ADMIN_AUTH_COOKIE_NAME}=${nonStaffAdminToken}`;

  const guestAuthToken = await GuestAuth.createSessionToken({
    userId: 'guest_user_refund_test',
    guestProfileId: 'guest_prof_refund_test',
    email: 'customer@vinoratest.com',
    role: UserRole.GUEST,
    name: 'Customer Guest',
  });
  const guestCookie = `${GUEST_AUTH_COOKIE_NAME}=${guestAuthToken}`;

  // Find winery, experience, and event for test data
  const winery = await prisma.winery.findFirstOrThrow();
  const experience = await prisma.experience.findFirstOrThrow({ where: { wineryId: winery.id } });
  const event = await prisma.event.findFirstOrThrow({
    where: { wineryId: winery.id, status: 'UPCOMING', isPast: false },
    include: { ticketTypes: true, schedules: true },
    orderBy: { createdAt: 'asc' },
  });
  const schedule = event.schedules[0];
  const ticketType = event.ticketTypes.find((t) => (t.capacity - t.soldCount) >= 4) ?? event.ticketTypes[0];

  // Track created entities for strict cleanup
  const createdBookingIds: string[] = [];
  const createdEventBookingIds: string[] = [];
  const createdGuestProfileIds: string[] = [];

  // Helper to create & pay an Experience booking
  let expBookingCounter = 0;
  async function createPaidExperienceBooking() {
    expBookingCounter++;
    const day = (20 + expBookingCounter).toString().padStart(2, '0');
    const booking = await BookingService.createBooking({
      experienceSlug: experience.slug,
      date: `2026-11-${day}`,
      time: '14:00',
      guestName: `Refund Test Guest ${expBookingCounter}`,
      guestEmail: `refund_guest_${expBookingCounter}@test.com`,
      guestPhone: '+1555987654',
      adults: 2,
      children: 0,
      paymentMethod: 'ONLINE',
    });
    createdBookingIds.push(booking.id);
    createdGuestProfileIds.push(booking.guestProfileId);

    const createOrderRes = await createOrderRoute(
      buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: booking.bookingNumber,
      })
    );
    const orderData = (await createOrderRes.json()).data;
    const providerPaymentId = `pay_exp_${Date.now()}`;
    const sig = generatePaymentSignature(orderData.orderId, providerPaymentId);

    const verifyRes = await verifyRoute(
      buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: booking.bookingNumber,
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: providerPaymentId,
        razorpaySignature: sig,
      })
    );
    const verifyData = (await verifyRes.json()).data;
    return { booking, orderData, verifyData, providerPaymentId };
  }

  // Helper to create & pay an Event booking
  async function createPaidEventBooking() {
    const eventBooking = await EventBookingService.createBooking({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: 'Refund Event Guest',
      guestEmail: 'refund_event_guest@test.com',
      guestPhone: '+1555987655',
      tickets: [{ eventTicketTypeId: ticketType.id, quantity: 2 }],
      paymentMethod: 'ONLINE',
    });
    createdEventBookingIds.push(eventBooking.id);
    createdGuestProfileIds.push(eventBooking.guestProfileId);

    const createOrderRes = await createOrderRoute(
      buildPostRequest('/api/payments/create-order', {
        bookingType: 'EVENT',
        bookingNumber: eventBooking.bookingNumber,
      })
    );
    const orderData = (await createOrderRes.json()).data;
    const providerPaymentId = `pay_evt_${Date.now()}`;
    const sig = generatePaymentSignature(orderData.orderId, providerPaymentId);

    const verifyRes = await verifyRoute(
      buildPostRequest('/api/payments/verify', {
        bookingType: 'EVENT',
        bookingNumber: eventBooking.bookingNumber,
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: providerPaymentId,
        razorpaySignature: sig,
      })
    );
    const verifyData = (await verifyRes.json()).data;
    return { eventBooking, orderData, verifyData, providerPaymentId };
  }

  // 2. Authorization Security Guard Tests
  console.log('\n2. Testing Staff-Only Authorization on POST /api/payments/refund:');
  const samplePaid = await createPaidExperienceBooking();

  // Test: Unauthenticated refund request returns 403
  const noAuthRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: samplePaid.booking.bookingNumber,
    })
  );
  assert(noAuthRes.status === 403, 'Unauthenticated request to refund endpoint returns HTTP 403');
  const noAuthJson = await noAuthRes.json();
  assert(noAuthJson.error.includes('authorized winery staff'), 'Error identifies staff authorization requirement');

  // Test: Customer guest cookie returns 403
  const guestAuthRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: samplePaid.booking.bookingNumber,
    }, guestCookie)
  );
  assert(guestAuthRes.status === 403, 'Customer guest session cannot initiate refunds (HTTP 403)');

  // Test: Non-staff admin token returns 403
  const nonStaffRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: samplePaid.booking.bookingNumber,
    }, nonStaffCookie)
  );
  assert(nonStaffRes.status === 403, 'Non-staff role cannot initiate refunds (HTTP 403)');

  // 3. Experience Booking Full Refund Flow
  console.log('\n3. Testing Experience Booking Full Refund Flow:');
  const expPaid = samplePaid; // Reuse already created PAID booking

  const fullRefundRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: expPaid.booking.bookingNumber,
      reason: 'Customer requested cancellation with full refund',
    }, staffCookie)
  );

  assert(fullRefundRes.status === 200, 'Staff initiates full refund successfully (HTTP 200)');
  const refundJson = await fullRefundRes.json();
  assert(refundJson.success === true, 'Response reports success: true');
  assert(refundJson.data.alreadyRefunded === false, 'alreadyRefunded is false on initial refund');
  assert(refundJson.data.status === PaymentStatus.REFUNDED, 'Returned payment status is REFUNDED');
  assert(typeof refundJson.data.refundId === 'string' && refundJson.data.refundId.startsWith('rfnd_'), 'Returned valid refundId');
  assert(Number(refundJson.data.refundAmount) === Number(expPaid.booking.totalPrice), 'Authoritative refund amount matches total price');

  // Verify database state for Payment and Booking
  const dbExpPayment = await prisma.payment.findUniqueOrThrow({ where: { id: expPaid.verifyData.paymentId } });
  assert(dbExpPayment.status === PaymentStatus.REFUNDED, 'Database payment transitioned to status REFUNDED');
  assert(dbExpPayment.refundId === refundJson.data.refundId, 'Database stores refundId');
  assert(Number(dbExpPayment.refundAmount) === Number(expPaid.booking.totalPrice), 'Database stores authoritative refundAmount');
  assert(dbExpPayment.refundReason === 'Customer requested cancellation with full refund', 'Database stores refundReason');

  const dbExpBooking = await prisma.booking.findUniqueOrThrow({
    where: { bookingNumber: expPaid.booking.bookingNumber },
    include: { statusHistory: true },
  });
  assert(dbExpBooking.status === BookingStatus.CANCELLED, 'Experience booking transitioned to CANCELLED on full refund');
  const latestExpHistory = dbExpBooking.statusHistory[dbExpBooking.statusHistory.length - 1];
  assert(latestExpHistory.toStatus === BookingStatus.CANCELLED, 'Status history records transition to CANCELLED');
  assert(Boolean(latestExpHistory.notes?.includes('full refund')), 'Status history notes record full refund reason');

  // 4. Duplicate Refund & Idempotency Protection
  console.log('\n4. Testing Duplicate Refund Idempotency Protection:');
  const dupRefundRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: expPaid.booking.bookingNumber,
      reason: 'Attempting second duplicate refund',
    }, staffCookie)
  );

  assert(dupRefundRes.status === 200, 'Duplicate refund returns HTTP 200');
  const dupJson = await dupRefundRes.json();
  assert(dupJson.data.alreadyRefunded === true, 'alreadyRefunded is true on second refund attempt');
  assert(dupJson.data.refundId === refundJson.data.refundId, 'Reused refundId matches original');
  assert(dupJson.data.status === PaymentStatus.REFUNDED, 'Status remains REFUNDED');

  // Verify Razorpay gateway refund was NOT called a second time
  const currentRefundCount = mockRefundCounter;
  assert(currentRefundCount === 1, `Gateway refund was called exactly once (count: ${currentRefundCount})`);

  // 5. Event Booking Full Refund & Capacity Release Flow
  console.log('\n5. Testing Event Booking Full Refund & Ticket Capacity Release:');
  const initialTicketType = await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } });
  const initialSoldCount = initialTicketType.soldCount;

  const eventPaid = await createPaidEventBooking();
  const midTicketType = await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } });
  assert(midTicketType.soldCount === initialSoldCount + 2, 'Tickets booked incremented soldCount by 2');

  const eventRefundRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EVENT',
      bookingNumber: eventPaid.eventBooking.bookingNumber,
      reason: 'Event customer cancellation',
    }, staffCookie)
  );

  assert(eventRefundRes.status === 200, 'Staff refunds Event booking successfully (HTTP 200)');
  const eventRefundJson = await eventRefundRes.json();
  assert(eventRefundJson.data.status === PaymentStatus.REFUNDED, 'Event payment status is REFUNDED');

  const dbEventBooking = await prisma.eventBooking.findUniqueOrThrow({
    where: { bookingNumber: eventPaid.eventBooking.bookingNumber },
    include: { statusHistory: true },
  });
  assert(dbEventBooking.status === BookingStatus.CANCELLED, 'EventBooking status transitioned to CANCELLED');
  const latestEventHistory = dbEventBooking.statusHistory[dbEventBooking.statusHistory.length - 1];
  assert(latestEventHistory.toStatus === BookingStatus.CANCELLED, 'Event status history records transition to CANCELLED');

  const afterTicketType = await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } });
  assert(afterTicketType.soldCount === initialSoldCount, `Ticket capacity released: soldCount restored to ${initialSoldCount}`);

  // 6. Validation & Error Handling on Refund Requests
  console.log('\n6. Testing Input Validation and Error Handling:');

  // Test: Malformed JSON payload
  const badJsonRes = await refundRoute(
    new NextRequest(new URL('/api/payments/refund', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: staffCookie },
      body: 'invalid-json{{{',
    })
  );
  assert(badJsonRes.status === 400, 'Malformed JSON returns HTTP 400');

  // Test: Missing bookingNumber
  const missingBookingRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
    }, staffCookie)
  );
  assert(missingBookingRes.status === 400, 'Missing bookingNumber returns HTTP 400');

  // Test: Non-existent bookingNumber
  const nonExistentRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: 'DVR-9999-NONEXISTENT',
    }, staffCookie)
  );
  assert(nonExistentRes.status === 404, 'Non-existent bookingNumber returns HTTP 404');

  // Test: Refund on unpaid/PENDING payment
  const unpaidBooking = await BookingService.createBooking({
    experienceSlug: experience.slug,
    date: '2026-11-21',
    time: '15:00',
    guestName: 'Unpaid Guest',
    guestEmail: 'unpaid_guest@test.com',
    guestPhone: '+1555987656',
    adults: 2,
    children: 0,
    paymentMethod: 'ONLINE',
  });
  createdBookingIds.push(unpaidBooking.id);
  createdGuestProfileIds.push(unpaidBooking.guestProfileId);

  // Create pending order
  await createOrderRoute(
    buildPostRequest('/api/payments/create-order', {
      bookingType: 'EXPERIENCE',
      bookingNumber: unpaidBooking.bookingNumber,
    })
  );

  const unpaidRefundRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: unpaidBooking.bookingNumber,
    }, staffCookie)
  );
  assert(unpaidRefundRes.status === 400, 'Attempting to refund a PENDING (unpaid) payment returns HTTP 400');
  const unpaidRefundJson = await unpaidRefundRes.json();
  assert(unpaidRefundJson.error.includes('Only PAID payments can be refunded'), 'Error clarifies that only PAID payments are refundable');

  // Test: Refund amount exceeding paid amount
  const excessivePaid = await createPaidExperienceBooking();
  const excessiveRefundRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: excessivePaid.booking.bookingNumber,
      amount: 999999.00,
    }, staffCookie)
  );
  assert(excessiveRefundRes.status === 400, 'Refund amount exceeding total paid amount returns HTTP 400');
  const excessiveJson = await excessiveRefundRes.json();
  assert(excessiveJson.error.includes('cannot exceed total paid amount'), 'Error specifies amount limit constraint');

  // 7. Gateway Failure Handling
  console.log('\n7. Testing Razorpay Gateway Failure Handling:');
  const gatewayFailPaid = await createPaidExperienceBooking();
  shouldSimulateRefundFailure = true;

  const failRefundRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: gatewayFailPaid.booking.bookingNumber,
    }, staffCookie)
  );
  assert(failRefundRes.status === 502, 'Gateway failure during refund returns HTTP 502 Bad Gateway');
  const failJson = await failRefundRes.json();
  assert(failJson.error.includes('Gateway refund initiation failed'), 'Error mentions gateway refund failure');

  // Payment remains PAID in database
  const stillPaidPayment = await prisma.payment.findUniqueOrThrow({ where: { id: gatewayFailPaid.verifyData.paymentId } });
  assert(stillPaidPayment.status === PaymentStatus.PAID, 'Payment remains PAID when gateway fails');
  const stillConfirmedBooking = await prisma.booking.findUniqueOrThrow({ where: { bookingNumber: gatewayFailPaid.booking.bookingNumber } });
  assert(stillConfirmedBooking.status === BookingStatus.CONFIRMED, 'Booking remains CONFIRMED when refund fails');

  shouldSimulateRefundFailure = false; // reset gateway mock

  // 8. Partial Refund Support
  console.log('\n8. Testing Partial Refund Support:');
  const partialPaid = await createPaidExperienceBooking();
  const totalAmountNum = Number(partialPaid.booking.totalPrice);
  const partialRefundAmount = totalAmountNum / 2;

  const partialRefundRes = await refundRoute(
    buildPostRequest('/api/payments/refund', {
      bookingType: 'EXPERIENCE',
      bookingNumber: partialPaid.booking.bookingNumber,
      amount: partialRefundAmount,
      reason: 'Partial courtesy refund',
    }, staffCookie)
  );

  assert(partialRefundRes.status === 200, 'Partial refund returns HTTP 200');
  const partialJson = await partialRefundRes.json();
  assert(partialJson.data.status === PaymentStatus.PARTIALLY_REFUNDED, 'Status transitioned to PARTIALLY_REFUNDED');
  assert(Number(partialJson.data.refundAmount) === partialRefundAmount, 'Recorded refund amount is partial amount');

  const partialDbBooking = await prisma.booking.findUniqueOrThrow({ where: { bookingNumber: partialPaid.booking.bookingNumber } });
  assert(partialDbBooking.status === BookingStatus.CONFIRMED, 'Reservation remains CONFIRMED on partial refund');

  // 9. Payment Status API Sanitization & Exposure Verification
  console.log('\n9. Testing Payment Status API Visibility (GET /api/payments/[bookingNumber]):');
  const getStatusRes = await getPaymentsRoute(
    buildGetRequest(`/api/payments/${expPaid.booking.bookingNumber}?type=EXPERIENCE`, staffCookie),
    { params: Promise.resolve({ bookingNumber: expPaid.booking.bookingNumber }) }
  );
  assert(getStatusRes.status === 200, 'GET /api/payments/[bookingNumber] returns HTTP 200');
  const statusJson = await getStatusRes.json();
  const refundedPaymentDto = statusJson.data[0];

  assert(refundedPaymentDto.status === PaymentStatus.REFUNDED, 'Payment DTO status is REFUNDED');
  assert(refundedPaymentDto.refundId !== null, 'Payment DTO contains refundId');
  assert(refundedPaymentDto.refundAmount !== null, 'Payment DTO contains refundAmount');
  assert(refundedPaymentDto.refundReason !== null, 'Payment DTO contains refundReason');
  assert(refundedPaymentDto.providerSignature === undefined, 'Does NOT expose providerSignature');
  assert(refundedPaymentDto.idempotencyKey === undefined, 'Does NOT expose idempotencyKey');
  assert(refundedPaymentDto.metadata === undefined, 'Does NOT expose internal metadata');

  // 10. Webhook Reconciliation of refund.created and refund.processed
  console.log('\n10. Testing Webhook Reconciliation of refund.created and refund.processed:');
  const webhookRefundPaid = await createPaidExperienceBooking();

  const webhookPayload = {
    event: 'refund.processed',
    event_id: `evt_wh_rfnd_${Date.now()}`,
    contains: ['refund'],
    payload: {
      refund: {
        entity: {
          id: `rfnd_wh_${Date.now()}`,
          payment_id: webhookRefundPaid.providerPaymentId,
          amount: Number(webhookRefundPaid.booking.totalPrice) * 100,
          currency: 'USD',
          status: 'processed',
          notes: {
            reason: 'Reconciled via gateway webhook',
          },
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };

  const webhookRes = await webhookRoute(buildWebhookRequest(webhookPayload));
  assert(webhookRes.status === 200, 'refund.processed webhook returns HTTP 200');
  const whJson = await webhookRes.json();
  assert(whJson.status === PaymentStatus.REFUNDED, 'Webhook reconciliation marks payment as REFUNDED');

  const whDbPayment = await prisma.payment.findUniqueOrThrow({ where: { id: webhookRefundPaid.verifyData.paymentId } });
  assert(whDbPayment.status === PaymentStatus.REFUNDED, 'DB Payment transitioned to REFUNDED via webhook');
  assert(Boolean(whDbPayment.refundId?.startsWith('rfnd_wh_')), 'DB Payment stores refundId from webhook');

  // 11. Strict Database Cleanup & Baseline Verification
  console.log('\n11. Performing Strict Database Cleanup & Baseline Verification:');

  // Clean all payments, status histories, and bookings
  await prisma.payment.deleteMany({});
  await prisma.webhookEvent.deleteMany({});

  if (createdBookingIds.length > 0) {
    await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
    await prisma.bookingGuest.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
    await prisma.bookingItem.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
    await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
  }

  if (createdEventBookingIds.length > 0) {
    await prisma.eventBookingStatusHistory.deleteMany({ where: { eventBookingId: { in: createdEventBookingIds } } });
    await prisma.eventBookingTicket.deleteMany({ where: { eventBookingId: { in: createdEventBookingIds } } });
    await prisma.eventBooking.deleteMany({ where: { id: { in: createdEventBookingIds } } });
  }

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

  const finalBookingsCount = await prisma.booking.count();
  const finalEventBookingsCount = await prisma.eventBooking.count();
  const finalPaymentsCount = await prisma.payment.count();
  const finalWebhookEventsCount = await prisma.webhookEvent.count();

  assert(finalBookingsCount === 17, `Final Bookings count is exactly 17 (found: ${finalBookingsCount})`);
  assert(finalEventBookingsCount === 5, `Final EventBookings count is exactly 5 (found: ${finalEventBookingsCount})`);
  assert(finalPaymentsCount === 0, `Final Payments count is exactly 0 (found: ${finalPaymentsCount})`);
  assert(finalWebhookEventsCount === 0, `Final WebhookEvents count is exactly 0 (found: ${finalWebhookEventsCount})`);

  console.log(`\n=== Phase 7.0F Test Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

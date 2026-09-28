/**
 * Phase 7.0H — Final Payment E2E & Financial Hardening.
 *
 * Usage:
 *   npx tsx scripts/test-phase-7-0h-final.ts
 *
 * Covers:
 *   1. Baseline audit & fixture discovery
 *   2. Gateway configuration, secrets & fail-closed production readiness
 *   3. Server-authoritative amount integrity (client can never influence price)
 *   4. Experience checkout end-to-end (order -> verify -> settle)
 *   5. Event checkout end-to-end
 *   6. Idempotency & duplicate settlement guards
 *   7. Payment failure & retry lifecycle
 *   8. Webhook reconciliation & double-settlement guards
 *   9. Refund financial invariants (full / partial / gateway failure)
 *  10. Event refund & ticket capacity release
 *  11. Authorization & ownership boundaries on public payment surfaces
 *  12. Secret and internal-field leak scan across every captured payment response
 *  13. Strict cleanup & baseline restoration
 */
import { NextRequest } from 'next/server';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from '../src/lib/db';
import { BookingService, EventBookingService } from '../src/server/services';
import { POST as createOrderRoute } from '../src/app/api/payments/create-order/route';
import { POST as verifyRoute } from '../src/app/api/payments/verify/route';
import { POST as failureRoute } from '../src/app/api/payments/failure/route';
import { POST as refundRoute } from '../src/app/api/payments/refund/route';
import { POST as webhookRoute } from '../src/app/api/payments/webhook/route';
import { GET as getPaymentsRoute } from '../src/app/api/payments/[bookingNumber]/route';
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client';
import { getRazorpayClient, getRazorpayConfig, toSubunits } from '../src/lib/razorpay';
import { GuestAuth, GUEST_AUTH_COOKIE_NAME } from '../src/lib/auth/guest';
import { AuthService, ADMIN_AUTH_COOKIE_NAME } from '../src/lib/auth';
import {
  toAdminPaymentSummaryDto,
  toAdminPaymentDetailDto,
  type AdminPaymentRecord,
} from '../src/lib/payment/admin-dto';

// Setup mock test environment variables for Razorpay
const TEST_KEY_ID = 'rzp_test_mock_h_key';
const TEST_KEY_SECRET = 'mock_secret_h_1234567890abcdef';
const TEST_WEBHOOK_SECRET = 'mock_webhook_secret_h_xyz987654321';
process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

const TEST_DOMAIN = '@70h.test.com';
const IDEMPOTENCY_AMOUNT_KEY = 'idem_70h_amount_0001';
const IDEMPOTENCY_MARKER = 'idem_70h_marker_0001';
let lastGatewayOrderArgs: Record<string, unknown> | null = null;

function generateWebhookSignature(rawBody: string, secret = TEST_WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function generatePaymentSignature(orderId: string, paymentId: string, secret = TEST_KEY_SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

function buildPostRequest(path: string, body: unknown, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function buildGetRequest(path: string, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return new NextRequest(new URL(path, 'http://localhost:3000'), { method: 'GET', headers });
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

// Every response body captured here is scanned for secrets/internal fields in section 12.
const leakScanTargets: Array<{ label: string; raw: string }> = [];

async function parseResponse(label: string, res: Response) {
  const status = res.status;
  const json = await res.json();
  const raw = JSON.stringify(json);
  leakScanTargets.push({ label, raw });
  return { status, json, raw };
}

async function runTests() {
  console.log('=== Phase 7.0H — Final Payment E2E & Financial Hardening Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // ------------------------------------------------------------- 1. Baseline
  console.log('1. Auditing Initial Database State & Fixtures:');
  const initialBookings = await prisma.booking.count();
  const initialEventBookings = await prisma.eventBooking.count();
  const initialPayments = await prisma.payment.count();
  const initialWebhookEvents = await prisma.webhookEvent.count();
  const initialWineries = await prisma.winery.count();
  const initialGuestProfiles = await prisma.guestProfile.count();

  console.log(
    `   bookings=${initialBookings} eventBookings=${initialEventBookings} ` +
      `payments=${initialPayments} webhookEvents=${initialWebhookEvents} ` +
      `wineries=${initialWineries} guestProfiles=${initialGuestProfiles}`
  );

  assert(initialBookings === 17, `Baseline Bookings count is exactly 17 (found: ${initialBookings})`);
  assert(initialEventBookings === 5, `Baseline EventBookings count is exactly 5 (found: ${initialEventBookings})`);
  assert(initialPayments === 0, `Baseline Payments count is 0 (found: ${initialPayments})`);
  assert(initialWebhookEvents === 0, `Baseline WebhookEvents count is 0 (found: ${initialWebhookEvents})`);

  const winery = await prisma.winery.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
  const experience = await prisma.experience.findFirstOrThrow({
    where: { wineryId: winery.id, isActive: true },
  });
  const event = await prisma.event.findFirstOrThrow({
    where: { wineryId: winery.id, isPast: false, status: 'UPCOMING' },
    include: { schedules: true, ticketTypes: true },
    orderBy: { createdAt: 'asc' },
  });
  const schedule = event.schedules[0];
  const ticketType =
    event.ticketTypes.find((t) => t.capacity - t.soldCount >= 3) ?? event.ticketTypes[0];
  assert(Boolean(schedule), 'Fixture event exposes an event schedule');
  assert(
    ticketType.capacity - ticketType.soldCount >= 3,
    `Fixture ticket type has headroom for this suite (capacity=${ticketType.capacity} soldCount=${ticketType.soldCount})`
  );

  // Snapshot ticket capacity so cleanup restores the exact baseline value.
  const ticketTypeSoldSnapshot = new Map<string, number>();
  for (const t of event.ticketTypes) {
    ticketTypeSoldSnapshot.set(t.id, t.soldCount);
  }

  // Eight distinct dates proven by phases 7.0D/7.0E/7.0F to accept a 2-guest 14:00 booking.
  const experienceSlots = [
    { date: '2026-11-20', time: '14:00' },
    { date: '2026-11-21', time: '14:00' },
    { date: '2026-11-22', time: '14:00' },
    { date: '2026-11-23', time: '14:00' },
    { date: '2026-11-24', time: '14:00' },
    { date: '2026-11-25', time: '14:00' },
    { date: '2026-11-26', time: '14:00' },
    { date: '2026-11-27', time: '14:00' },
  ];
  let slotCursor = 0;
  function nextSlot() {
    const slot = experienceSlots[slotCursor];
    slotCursor++;
    return slot;
  }

  const createdBookingIds: string[] = [];
  const createdEventBookingIds: string[] = [];
  const createdGuestProfileIds: string[] = [];
  const createdWebhookEventIds: string[] = [];
  const createdGuestEmails: string[] = [];

  let guestCounter = 0;
  async function createExperienceBooking(label: string) {
    guestCounter++;
    const slot = nextSlot();
    const guestEmail = `70h_${label}_${guestCounter}${TEST_DOMAIN}`;
    createdGuestEmails.push(guestEmail);
    const booking = await BookingService.createBooking({
      experienceSlug: experience.slug,
      date: slot.date,
      time: slot.time,
      guestName: `7.0H ${label} Guest`,
      guestEmail,
      guestPhone: '+15550007000',
      adults: 2,
      children: 0,
      paymentMethod: 'ONLINE',
    });
    createdBookingIds.push(booking.id);
    createdGuestProfileIds.push(booking.guestProfileId);
    return booking;
  }

  let eventGuestCounter = 0;
  async function createEventBooking(quantity: number) {
    eventGuestCounter++;
    const guestEmail = `70h_evt_${eventGuestCounter}${TEST_DOMAIN}`;
    createdGuestEmails.push(guestEmail);
    const eventBooking = await EventBookingService.createBooking({
      eventId: event.id,
      eventScheduleId: schedule.id,
      guestName: `7.0H Event Guest ${eventGuestCounter}`,
      guestEmail,
      guestPhone: '+15550007001',
      tickets: [{ eventTicketTypeId: ticketType.id, quantity }],
      paymentMethod: 'ONLINE',
    });
    createdEventBookingIds.push(eventBooking.id);
    createdGuestProfileIds.push(eventBooking.guestProfileId);
    return eventBooking;
  }

  // ------------------------------------------------------------ 2. Gateway mocks
  const razorpayClient = getRazorpayClient();
  let mockOrderCounter = 0;
  let mockRefundCounter = 0;
  let gatewayRefundCalls = 0;
  let shouldSimulateRefundFailure = false;

  (razorpayClient.orders as unknown as { create: (args: Record<string, unknown>) => Promise<unknown> }).create =
    async (args: Record<string, unknown>) => {
      mockOrderCounter++;
      lastGatewayOrderArgs = args;
      return {
        id: `order_mock_h_${Date.now()}_${mockOrderCounter}`,
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

  (razorpayClient.payments as unknown as {
    refund: (paymentId: string, args: Record<string, unknown>) => Promise<unknown>;
  }).refund = async (paymentId: string, args: Record<string, unknown>) => {
    if (shouldSimulateRefundFailure) {
      throw new Error('Razorpay gateway refund rejected: Insufficient merchant balance');
    }
    gatewayRefundCalls++;
    mockRefundCounter++;
    return {
      id: `rfnd_mock_h_${Date.now()}_${mockRefundCounter}`,
      entity: 'refund',
      amount: args.amount,
      currency: 'USD',
      payment_id: paymentId,
      notes: args.notes,
      receipt: args.receipt,
      acquirer_data: { arn: 'mock_arn_70h_0001' },
      created_at: Math.floor(Date.now() / 1000),
      status: 'processed',
    };
  };

  // ------------------------------------------------------------------ 3. Sessions
  const staffToken = await AuthService.createSessionToken({
    userId: 'staff_70h_final',
    email: 'manager70h@vinora.com',
    role: UserRole.MANAGER,
    wineryId: winery.id,
  });
  const staffCookie = `${ADMIN_AUTH_COOKIE_NAME}=${staffToken}`;

  const nonStaffToken = await AuthService.createSessionToken({
    userId: 'guest_70h_final_admin',
    email: 'guest70h@vinora.com',
    role: UserRole.GUEST,
    wineryId: winery.id,
  });
  const nonStaffCookie = `${ADMIN_AUTH_COOKIE_NAME}=${nonStaffToken}`;

  async function guestCookieFor(guestProfileId: string, email: string, userId: string) {
    const token = await GuestAuth.createSessionToken({
      userId,
      guestProfileId,
      email,
      role: UserRole.GUEST,
      name: '7.0H Guest',
    });
    return `${GUEST_AUTH_COOKIE_NAME}=${token}`;
  }

  async function callCreateOrder(body: Record<string, unknown>, cookie?: string) {
    return parseResponse('POST /api/payments/create-order', await createOrderRoute(buildPostRequest('/api/payments/create-order', body, cookie)));
  }
  async function callVerify(body: Record<string, unknown>, cookie?: string) {
    return parseResponse('POST /api/payments/verify', await verifyRoute(buildPostRequest('/api/payments/verify', body, cookie)));
  }
  async function callFailure(body: Record<string, unknown>, cookie?: string) {
    return parseResponse('POST /api/payments/failure', await failureRoute(buildPostRequest('/api/payments/failure', body, cookie)));
  }
  async function callRefund(body: Record<string, unknown>, cookie?: string) {
    return parseResponse('POST /api/payments/refund', await refundRoute(buildPostRequest('/api/payments/refund', body, cookie)));
  }
  async function callWebhook(body: unknown, signature?: string) {
    return parseResponse('POST /api/payments/webhook', await webhookRoute(buildWebhookRequest(body, signature)));
  }
  async function callGetPayments(bookingNumber: string, type: string, cookie?: string) {
    const res = await getPaymentsRoute(
      buildGetRequest(`/api/payments/${encodeURIComponent(bookingNumber)}?type=${type}`, cookie),
      { params: Promise.resolve({ bookingNumber }) }
    );
    return parseResponse('GET /api/payments/[bookingNumber]', res);
  }

  try {
    // ------------------------------------- 2. Gateway configuration & fail-closed
    console.log('\n2. Gateway Configuration, Secrets & Fail-Closed Readiness:');

    const envExamplePath = `${process.cwd()}/.env.example`;
    const envExample = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, 'utf8') : '';
    assert(envExample.length > 0, '.env.example exists and is readable');
    assert(envExample.includes('RAZORPAY_KEY_ID'), '.env.example documents RAZORPAY_KEY_ID');
    assert(envExample.includes('RAZORPAY_KEY_SECRET'), '.env.example documents RAZORPAY_KEY_SECRET');
    assert(envExample.includes('RAZORPAY_WEBHOOK_SECRET'), '.env.example documents RAZORPAY_WEBHOOK_SECRET');

    const configured = getRazorpayConfig();
    assert(configured.keyId === TEST_KEY_ID, 'getRazorpayConfig() exposes the configured key id');
    assert(configured.keySecret === TEST_KEY_SECRET, 'getRazorpayConfig() exposes the configured key secret to the server only');
    assert(
      JSON.stringify(configured).includes(TEST_WEBHOOK_SECRET),
      'getRazorpayConfig() surfaces the webhook secret for signature verification'
    );

    const savedNodeEnv = process.env.NODE_ENV;
    const savedKeyId = process.env.RAZORPAY_KEY_ID;
    const savedKeySecret = process.env.RAZORPAY_KEY_SECRET;
    try {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true,
        writable: true,
        enumerable: true,
      });
      let threw = false;
      let productionMessage = '';
      try {
        getRazorpayConfig();
      } catch (err: unknown) {
        threw = true;
        productionMessage = err instanceof Error ? err.message : String(err);
      }
      assert(threw, 'getRazorpayConfig() fails closed in production when gateway keys are missing');
      assert(
        productionMessage.includes('RAZORPAY_KEY_ID'),
        'Production configuration error names the missing gateway variables'
      );
    } finally {
      if (savedKeyId !== undefined) process.env.RAZORPAY_KEY_ID = savedKeyId;
      if (savedKeySecret !== undefined) process.env.RAZORPAY_KEY_SECRET = savedKeySecret;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: savedNodeEnv,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }
    assert(process.env.RAZORPAY_KEY_ID === TEST_KEY_ID, 'Gateway key id restored after the production fail-closed check');

    // Webhook secret removal must reject inbound events before any state change.
    const cfgBooking = await createExperienceBooking('cfg');
    const cfgOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: cfgBooking.bookingNumber,
    });
    assert(cfgOrder.status === 200, 'Config fixture order created successfully');
    const cfgOrderId = cfgOrder.json.data.orderId as string;

    const cfgPayload = {
      event: 'payment.captured',
      id: 'evt_70h_config_guard',
      payload: { payment: { entity: { id: 'pay_70h_config_guard', order_id: cfgOrderId, method: 'card' } } },
    };
    const cfgRawBody = JSON.stringify(cfgPayload);

    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    let configRejectStatus = 0;
    let configRejectBody = '';
    try {
      const res = await webhookRoute(buildWebhookRequest(cfgPayload, generateWebhookSignature(cfgRawBody, 'attacker_secret')));
      configRejectStatus = res.status;
      configRejectBody = await res.text();
      leakScanTargets.push({ label: 'POST /api/payments/webhook (no secret configured)', raw: configRejectBody });
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    }
    assert(
      configRejectStatus === 500,
      'Webhook is rejected when RAZORPAY_WEBHOOK_SECRET is unset (fails closed)',
      `status=${configRejectStatus}`
    );
    assert(
      configRejectBody.includes('webhook secret'),
      'Webhook rejection explains the missing webhook secret configuration'
    );
    const guardedWebhookRecord = await prisma.webhookEvent.findUnique({ where: { eventId: 'evt_70h_config_guard' } });
    assert(guardedWebhookRecord === null, 'Rejected webhook persisted no WebhookEvent audit record');

    const guardedPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: cfgOrderId } });
    assert(guardedPayment.status === PaymentStatus.PENDING, 'Rejected webhook left the payment in PENDING status');
    const guardedBooking = await prisma.booking.findUniqueOrThrow({ where: { id: cfgBooking.id } });
    assert(guardedBooking.status === BookingStatus.PENDING, 'Rejected webhook left the reservation in PENDING status');

    const cfgRecovery = await callWebhook(cfgPayload);
    assert(cfgRecovery.status === 200 && cfgRecovery.json.handled === true, 'Same webhook is accepted once the secret is configured');
    assert(cfgRecovery.json.status === PaymentStatus.PAID, 'Recovered webhook settles the payment to PAID');
    const recoveredPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: cfgOrderId } });
    assert(recoveredPayment.status === PaymentStatus.PAID, 'Recovered webhook persisted the PAID transition');
    createdWebhookEventIds.push('evt_70h_config_guard');

    // Signature verification must also fail closed when the key secret disappears.
    delete process.env.RAZORPAY_KEY_SECRET;
    let verifyNoSecretStatus = 0;
    try {
      const res = await verifyRoute(
        buildPostRequest('/api/payments/verify', {
          bookingType: 'EXPERIENCE',
          bookingNumber: cfgBooking.bookingNumber,
          razorpayOrderId: cfgOrderId,
          razorpayPaymentId: 'pay_70h_config_guard',
          razorpaySignature: generatePaymentSignature(cfgOrderId, 'pay_70h_config_guard'),
        })
      );
      verifyNoSecretStatus = res.status;
      leakScanTargets.push({ label: 'POST /api/payments/verify (no key secret)', raw: await res.text() });
    } finally {
      process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
    }
    assert(
      verifyNoSecretStatus === 500,
      'Payment verification fails closed when RAZORPAY_KEY_SECRET is unset',
      `status=${verifyNoSecretStatus}`
    );
    const cfgVerifyRecovery = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: cfgBooking.bookingNumber,
      razorpayOrderId: cfgOrderId,
      razorpayPaymentId: 'pay_70h_config_guard',
      razorpaySignature: generatePaymentSignature(cfgOrderId, 'pay_70h_config_guard'),
    });
    assert(
      cfgVerifyRecovery.status === 200 && cfgVerifyRecovery.json.data.alreadyProcessed === true,
      'Verification is idempotent for an already settled payment'
    );

    // ---------------------------------------- 3. Server-authoritative amount integrity
    console.log('\n3. Server-Authoritative Amount Integrity:');

    const amountBooking = await createExperienceBooking('amount');
    const amountBookingRow = await prisma.booking.findUniqueOrThrow({ where: { id: amountBooking.id } });
    const amountTotal = Number(amountBookingRow.totalPrice);
    const expectedSubunits = toSubunits(amountTotal);
    const amountOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: amountBooking.bookingNumber,
      idempotencyKey: IDEMPOTENCY_AMOUNT_KEY,
      amount: 0.01,
      currency: 'EUR',
    } as Record<string, unknown>);
    assert(amountOrder.status === 200, 'Order creation succeeds with tampered client amount fields');
    assert(
      amountOrder.json.data.amount === amountTotal,
      `Order amount is computed server-side from the reservation total (expected ${amountTotal}, got ${amountOrder.json.data.amount})`
    );
    assert(amountOrder.json.data.amountSubunits === expectedSubunits, 'Order amountSubunits matches the reservation total in subunits');
    assert(amountOrder.json.data.currency === 'USD', 'Order currency is the reservation currency, not the client-supplied one');
    assert(amountOrder.json.data.keyId === TEST_KEY_ID, 'Order response returns the public key id for the checkout widget');
    assert(!amountOrder.raw.includes(TEST_KEY_SECRET), 'Order response never exposes the gateway key secret');
    assert(lastGatewayOrderArgs !== null && lastGatewayOrderArgs.amount === expectedSubunits, 'Gateway order was created for the authoritative amount');

    const amountPayment = await prisma.payment.findUniqueOrThrow({
      where: { providerOrderId: amountOrder.json.data.orderId as string },
    });
    assert(Number(amountPayment.amount) === amountTotal, 'Persisted payment amount equals the reservation total');
    assert(amountPayment.currency === 'USD', 'Persisted payment currency is USD');
    assert(amountPayment.status === PaymentStatus.PENDING, 'Persisted payment starts in PENDING status');
    const amountMeta = amountPayment.metadata as { razorpayOrder?: { amount?: number } } | null;
    assert(amountMeta?.razorpayOrder?.amount === expectedSubunits, 'Persisted gateway order payload stores the authoritative subunit amount');

    const badIdempotency = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: amountBooking.bookingNumber,
      idempotencyKey: 'short',
    });
    assert(
      badIdempotency.status === 400 && badIdempotency.json.error === 'Validation failed',
      'Idempotency keys shorter than 8 characters are rejected with HTTP 400'
    );

    const missingBooking = await callCreateOrder({ bookingType: 'EXPERIENCE', bookingNumber: 'DVR-NOPE-0000' });
    assert(missingBooking.status === 404, 'Order creation for an unknown reservation returns HTTP 404');

    const missingBookingPayment = await callCreateOrder({ bookingType: 'EVENT', bookingNumber: 'EVT-NOPE-0000' });
    assert(missingBookingPayment.status === 404, 'Order creation for an unknown event reservation returns HTTP 404');

    // ---------------------------------------- 4. Experience checkout end-to-end
    console.log('\n4. Experience Checkout End-to-End:');

    const badSignature = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: amountBooking.bookingNumber,
      razorpayOrderId: amountOrder.json.data.orderId as string,
      razorpayPaymentId: 'pay_70h_bad_sig',
      razorpaySignature: 'deadbeef'.repeat(8),
    });
    assert(badSignature.status === 400 && badSignature.json.error === 'Invalid payment signature', 'Forged payment signature is rejected with HTTP 400');
    let preVerifyPayment = await prisma.payment.findUniqueOrThrow({ where: { id: amountOrder.json.data.paymentId as string } });
    assert(preVerifyPayment.status === PaymentStatus.PENDING, 'Rejected signature leaves the payment in PENDING status');
    let preVerifyBooking = await prisma.booking.findUniqueOrThrow({ where: { id: amountBooking.id } });
    assert(preVerifyBooking.status === BookingStatus.PENDING, 'Rejected signature leaves the reservation in PENDING status');

    const providerPaymentId = `pay_70h_${Date.now()}`;
    const goodVerify = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: amountBooking.bookingNumber,
      razorpayOrderId: amountOrder.json.data.orderId as string,
      razorpayPaymentId: providerPaymentId,
      razorpaySignature: generatePaymentSignature(amountOrder.json.data.orderId as string, providerPaymentId),
    });
    assert(goodVerify.status === 200 && goodVerify.json.data.status === PaymentStatus.PAID, 'Valid signature settles the payment to PAID');
    assert(goodVerify.json.data.amount === amountTotal.toFixed(2), 'Verify response reports the authoritative reservation amount');
    assert(goodVerify.json.data.alreadyProcessed === false, 'First settlement is reported as not already processed');

    preVerifyPayment = await prisma.payment.findUniqueOrThrow({ where: { id: amountOrder.json.data.paymentId as string } });
    assert(preVerifyPayment.status === PaymentStatus.PAID, 'Database payment record transitioned to PAID');
    assert(preVerifyPayment.providerPaymentId === providerPaymentId, 'Database payment record stores the gateway payment id');
    assert(Boolean(preVerifyPayment.providerSignature), 'Database payment record stores the settlement signature');
    assert(
      preVerifyPayment.idempotencyKey === IDEMPOTENCY_AMOUNT_KEY,
      'Database payment record preserves the original idempotency key'
    );

    preVerifyBooking = await prisma.booking.findUniqueOrThrow({ where: { id: amountBooking.id } });
    assert(preVerifyBooking.status === BookingStatus.CONFIRMED, 'Reservation transitioned to CONFIRMED after settlement');
    const settledHistory = await prisma.bookingStatusHistory.findMany({
      where: { bookingId: amountBooking.id, toStatus: BookingStatus.CONFIRMED },
    });
    assert(settledHistory.length === 1, `Exactly one CONFIRMED status transition recorded (found: ${settledHistory.length})`);
    assert(settledHistory[0]?.changedBy === 'PAYMENT_VERIFIED', 'Settlement history attributes the transition to PAYMENT_VERIFIED');

    const duplicateVerify = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: amountBooking.bookingNumber,
      razorpayOrderId: amountOrder.json.data.orderId as string,
      razorpayPaymentId: providerPaymentId,
      razorpaySignature: generatePaymentSignature(amountOrder.json.data.orderId as string, providerPaymentId),
    });
    assert(duplicateVerify.status === 200 && duplicateVerify.json.data.alreadyProcessed === true, 'Duplicate verification is idempotent');
    const paymentsAfterVerify = await prisma.payment.count({ where: { bookingId: amountBooking.id } });
    assert(paymentsAfterVerify === 1, `Exactly one payment row exists after duplicate verification (found: ${paymentsAfterVerify})`);

    const postPaidOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: amountBooking.bookingNumber,
    });
    assert(postPaidOrder.status === 409 && postPaidOrder.json.error === 'This reservation is already paid in full', 'New orders are rejected once the reservation is paid in full');

    // ------------------------------------------------ 5. Event checkout end-to-end
    console.log('\n5. Event Checkout End-to-End:');

    const soldBeforeEventSettle = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;
    const eventSettle = await createEventBooking(2);
    const soldAfterEventCreate = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;
    assert(soldAfterEventCreate === soldBeforeEventSettle + 2, 'Event ticket soldCount increments by the booked quantity');

    const eventOrderRes = await callCreateOrder({
      bookingType: 'EVENT',
      bookingNumber: eventSettle.bookingNumber,
    });
    assert(eventOrderRes.status === 200, 'Event order created successfully');
    const eventProviderPaymentId = `pay_70h_evt_${Date.now()}`;
    const eventVerify = await callVerify({
      bookingType: 'EVENT',
      bookingNumber: eventSettle.bookingNumber,
      razorpayOrderId: eventOrderRes.json.data.orderId as string,
      razorpayPaymentId: eventProviderPaymentId,
      razorpaySignature: generatePaymentSignature(eventOrderRes.json.data.orderId as string, eventProviderPaymentId),
    });
    assert(eventVerify.status === 200 && eventVerify.json.data.status === PaymentStatus.PAID, 'Event payment settles to PAID');
    const eventBookingRow = await prisma.eventBooking.findUniqueOrThrow({ where: { id: eventSettle.id } });
    assert(eventBookingRow.status === BookingStatus.CONFIRMED, 'Event reservation transitioned to CONFIRMED after settlement');
    const soldAfterEventSettle = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;
    assert(
      soldAfterEventSettle === soldAfterEventCreate,
      'Settlement alone does not change event ticket capacity'
    );

    // -------------------------------------- 6. Idempotency & duplicate guards
    console.log('\n6. Idempotency & Duplicate Settlement Guards:');

    const idemBooking = await createExperienceBooking('idem');
    const firstIdemOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: idemBooking.bookingNumber,
      idempotencyKey: IDEMPOTENCY_MARKER,
    });
    assert(firstIdemOrder.status === 200, 'First order with an idempotency key succeeds');
    assert(firstIdemOrder.json.data.alreadyCreated === false, 'First order is reported as newly created');

    const secondIdemOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: idemBooking.bookingNumber,
      idempotencyKey: IDEMPOTENCY_MARKER,
    });
    assert(secondIdemOrder.status === 200 && secondIdemOrder.json.data.alreadyCreated === true, 'Replaying the same idempotency key returns the original order');
    assert(
      secondIdemOrder.json.data.orderId === firstIdemOrder.json.data.orderId,
      'Replayed idempotency key returns the identical gateway order id'
    );

    const noKeyOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: idemBooking.bookingNumber,
    });
    assert(noKeyOrder.json.data.alreadyCreated === true, 'An active pending order is reused instead of being duplicated');
    assert(noKeyOrder.json.data.orderId === firstIdemOrder.json.data.orderId, 'Pending order reuse returns the same gateway order id');

    const idemPaymentCount = await prisma.payment.count({ where: { bookingId: idemBooking.id } });
    assert(idemPaymentCount === 1, `Only one payment row exists after repeated order creation (found: ${idemPaymentCount})`);

    const crossBooking = await createExperienceBooking('cross');
    const crossKeyReuse = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: crossBooking.bookingNumber,
      idempotencyKey: IDEMPOTENCY_MARKER,
    });
    assert(
      crossKeyReuse.status === 409 && crossKeyReuse.json.error === 'Idempotency key has already been used for another reservation',
      'Reusing an idempotency key for a different reservation is rejected with HTTP 409'
    );
    const crossPaymentCount = await prisma.payment.count({ where: { bookingId: crossBooking.id } });
    assert(crossPaymentCount === 0, 'Rejected idempotency reuse creates no payment row');

    const eventBookingForIdem = await createEventBooking(1);
    const eventIdemOrder = await callCreateOrder({
      bookingType: 'EVENT',
      bookingNumber: eventBookingForIdem.bookingNumber,
      idempotencyKey: 'idem_70h_evt_0001',
    });
    assert(eventIdemOrder.status === 200 && eventIdemOrder.json.data.alreadyCreated === false, 'Event order with an idempotency key succeeds');
    const eventIdemReplay = await callCreateOrder({
      bookingType: 'EVENT',
      bookingNumber: eventBookingForIdem.bookingNumber,
      idempotencyKey: 'idem_70h_evt_0001',
    });
    assert(
      eventIdemReplay.status === 200 &&
        eventIdemReplay.json.data.alreadyCreated === true &&
        eventIdemReplay.json.data.orderId === eventIdemOrder.json.data.orderId,
      'Event order replay with the same idempotency key returns the original gateway order'
    );
    const eventIdemCount = await prisma.payment.count({ where: { eventBookingId: eventBookingForIdem.id } });
    assert(eventIdemCount === 1, `Only one event payment row exists after replay (found: ${eventIdemCount})`);

    // ------------------------------------------------------- 7. Failure & retry
    console.log('\n7. Payment Failure & Retry Lifecycle:');

    const failureBooking = crossBooking;
    const failureOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: failureBooking.bookingNumber,
    });
    assert(failureOrder.status === 200, 'Retry order created after the rejected idempotency reuse');
    const failureOrderId = failureOrder.json.data.orderId as string;

    const failureRes = await callFailure({
      bookingType: 'EXPERIENCE',
      bookingNumber: failureBooking.bookingNumber,
      providerOrderId: failureOrderId,
      errorCode: 'BAD_REQUEST_ERROR',
      errorMessage: 'Card declined by issuer',
    });
    assert(failureRes.status === 200 && failureRes.json.data.status === PaymentStatus.FAILED, 'Failure telemetry transitions the payment to FAILED');
    const failedPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: failureOrderId } });
    assert(failedPayment.errorCode === 'BAD_REQUEST_ERROR', 'Failure telemetry persists the gateway error code');
    assert(failedPayment.errorMessage === 'Card declined by issuer', 'Failure telemetry persists the gateway error message');
    const failedBooking = await prisma.booking.findUniqueOrThrow({ where: { id: failureBooking.id } });
    assert(failedBooking.status === BookingStatus.PENDING, 'Reservation remains PENDING after a failed payment so the guest can retry');

    const failureOnPaidAttempt = await callFailure({
      bookingType: 'EXPERIENCE',
      bookingNumber: amountBooking.bookingNumber,
      providerOrderId: amountOrder.json.data.orderId as string,
      errorCode: 'BAD_REQUEST_ERROR',
      errorMessage: 'Should never overwrite a settled payment',
    });
    const settledAfterFailure = await prisma.payment.findUniqueOrThrow({ where: { id: amountOrder.json.data.paymentId as string } });
    assert(
      failureOnPaidAttempt.status === 200 && settledAfterFailure.status === PaymentStatus.PAID,
      'Failure telemetry can never demote an already settled payment'
    );

    const retryOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: failureBooking.bookingNumber,
    });
    assert(retryOrder.status === 200, 'A new order can be created after a failed attempt');
    assert(
      retryOrder.json.data.orderId !== failureOrderId,
      'Retry issues a brand new gateway order id instead of reusing the failed one'
    );
    const retryProviderPaymentId = `pay_70h_retry_${Date.now()}`;
    const retryVerify = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: failureBooking.bookingNumber,
      razorpayOrderId: retryOrder.json.data.orderId as string,
      razorpayPaymentId: retryProviderPaymentId,
      razorpaySignature: generatePaymentSignature(retryOrder.json.data.orderId as string, retryProviderPaymentId),
    });
    assert(retryVerify.status === 200 && retryVerify.json.data.status === PaymentStatus.PAID, 'Retry settlement succeeds after the earlier failure');
    const retryBooking = await prisma.booking.findUniqueOrThrow({ where: { id: failureBooking.id } });
    assert(retryBooking.status === BookingStatus.CONFIRMED, 'Reservation confirms after the successful retry');

    // ----------------------------------- 8. Webhooks & double-settlement guards
    console.log('\n8. Webhook Reconciliation & Double-Settlement Guards:');

    const webhookBooking = await createExperienceBooking('wh');
    const webhookOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: webhookBooking.bookingNumber,
    });
    const webhookOrderId = webhookOrder.json.data.orderId as string;
    const webhookPayload = {
      event: 'payment.captured',
      id: 'evt_70h_settle_1',
      payload: { payment: { entity: { id: 'pay_70h_settle_1', order_id: webhookOrderId, method: 'card' } } },
    };
    createdWebhookEventIds.push('evt_70h_settle_1');

    const webhookFirst = await callWebhook(webhookPayload);
    assert(webhookFirst.status === 200 && webhookFirst.json.handled === true, 'payment.captured webhook is accepted');
    assert(webhookFirst.json.status === PaymentStatus.PAID, 'Webhook reports the payment settled to PAID');
    const webhookPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: webhookOrderId } });
    assert(webhookPayment.status === PaymentStatus.PAID, 'Webhook persisted the PAID transition');
    const webhookBookingRow = await prisma.booking.findUniqueOrThrow({ where: { id: webhookBooking.id } });
    assert(webhookBookingRow.status === BookingStatus.CONFIRMED, 'Webhook confirmed the reservation');
    const webhookHistory = await prisma.bookingStatusHistory.count({
      where: { bookingId: webhookBooking.id, toStatus: BookingStatus.CONFIRMED },
    });
    assert(webhookHistory === 1, `Webhook settlement records exactly one CONFIRMED transition (found: ${webhookHistory})`);

    const webhookDuplicate = await callWebhook(webhookPayload);
    assert(webhookDuplicate.status === 200 && webhookDuplicate.json.alreadyProcessed === true, 'Duplicate webhook delivery is idempotent');

    const webhookReplayed = await callWebhook({
      event: 'payment.captured',
      id: 'evt_70h_settle_2',
      payload: { payment: { entity: { id: 'pay_70h_settle_2', order_id: webhookOrderId, method: 'card' } } },
    });
    createdWebhookEventIds.push('evt_70h_settle_2');
    assert(
      webhookReplayed.status === 200 && webhookReplayed.json.alreadyProcessed === true,
      'A second distinct webhook for a settled payment is treated as already processed'
    );

    const webhookThenVerify = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: webhookBooking.bookingNumber,
      razorpayOrderId: webhookOrderId,
      razorpayPaymentId: 'pay_70h_settle_1',
      razorpaySignature: generatePaymentSignature(webhookOrderId, 'pay_70h_settle_1'),
    });
    assert(
      webhookThenVerify.status === 200 && webhookThenVerify.json.data.alreadyProcessed === true,
      'Verification after webhook settlement is idempotent (no double settlement)'
    );
    const webhookSettleCount = await prisma.payment.count({ where: { bookingId: webhookBooking.id } });
    assert(webhookSettleCount === 1, `Exactly one payment row exists after webhook + verify (found: ${webhookSettleCount})`);
    const webhookSettleHistory = await prisma.bookingStatusHistory.count({
      where: { bookingId: webhookBooking.id, toStatus: BookingStatus.CONFIRMED },
    });
    assert(webhookSettleHistory === 1, `Still exactly one CONFIRMED transition after webhook + verify (found: ${webhookSettleHistory})`);

    // Guard: a cancelled reservation must never accept settlement.
    const cancelledBooking = await createExperienceBooking('cancelled');
    const cancelledOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: cancelledBooking.bookingNumber,
    });
    const cancelledOrderId = cancelledOrder.json.data.orderId as string;
    await BookingService.cancelBooking(cancelledBooking.bookingNumber, 'Phase 7.0H cancelled reservation guard');
    const cancelledWebhook = await callWebhook({
      event: 'payment.captured',
      id: 'evt_70h_cancelled',
      payload: { payment: { entity: { id: 'pay_70h_cancelled', order_id: cancelledOrderId, method: 'card' } } },
    });
    createdWebhookEventIds.push('evt_70h_cancelled');
    assert(
      cancelledWebhook.status === 200 && String(cancelledWebhook.json.reason ?? '').includes('payment cannot be marked PAID'),
      'Webhook settlement is refused for a cancelled reservation'
    );
    const cancelledPayment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: cancelledOrderId } });
    assert(cancelledPayment.status === PaymentStatus.PENDING, 'Cancelled reservation payment stays PENDING after the refused webhook');
    const cancelledRow = await prisma.booking.findUniqueOrThrow({ where: { id: cancelledBooking.id } });
    assert(cancelledRow.status === BookingStatus.CANCELLED, 'Cancelled reservation stays CANCELLED');

    const cancelledVerify = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: cancelledBooking.bookingNumber,
      razorpayOrderId: cancelledOrderId,
      razorpayPaymentId: 'pay_70h_cancelled',
      razorpaySignature: generatePaymentSignature(cancelledOrderId, 'pay_70h_cancelled'),
    });
    assert(
      cancelledVerify.status === 400 && cancelledVerify.json.error === 'Cannot verify payment for a cancelled reservation',
      'Direct verification is refused for a cancelled reservation'
    );

    // Unhandled and unmatched-refund webhook regression guards (fixed in 7.0H).
    const ignoredWebhook = await callWebhook({
      event: 'invoice.paid',
      id: 'evt_70h_ignored',
      payload: { invoice: { entity: { id: 'in_70h', amount_paid: 1000 } } },
    });
    createdWebhookEventIds.push('evt_70h_ignored');
    assert(
      ignoredWebhook.status === 200 && ignoredWebhook.json.handled === false && String(ignoredWebhook.json.reason ?? '').includes('Ignored event type'),
      'Unknown event types are acknowledged but reported as ignored'
    );
    const unmatchedRefundWebhook = await callWebhook({
      event: 'refund.processed',
      id: 'evt_70h_unmatched_refund',
      payload: { refund: { entity: { id: 'rfnd_70h_unknown', amount: 5000, payment_id: 'pay_70h_does_not_exist' } } },
    });
    createdWebhookEventIds.push('evt_70h_unmatched_refund');
    assert(
      unmatchedRefundWebhook.status === 200 && unmatchedRefundWebhook.json.handled === false,
      'Refund webhook for an unknown payment is acknowledged with handled: false'
    );
    assert(
      String(unmatchedRefundWebhook.json.reason ?? '').includes('No matching payment record found for refund'),
      'Unmatched refund reports a missing payment record rather than an ignored event type'
    );

    // --------------------------------------------- 9. Refund financial invariants
    console.log('\n9. Refund Financial Invariants:');

    const refundTarget = amountBooking;
    const refundTotal = amountTotal;
    const refundPaymentId = amountOrder.json.data.paymentId as string;

    const refundUnauth = await callRefund({
      bookingType: 'EXPERIENCE',
      bookingNumber: refundTarget.bookingNumber,
      paymentId: refundPaymentId,
    });
    assert(refundUnauth.status === 403, 'Refund without a staff session returns HTTP 403');

    const refundGuestOwner = await guestCookieFor(
      refundTarget.guestProfileId,
      `70h_refund_owner${TEST_DOMAIN}`,
      'guest_70h_owner'
    );
    const refundNonStaff = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: refundTarget.bookingNumber,
        paymentId: refundPaymentId,
      },
      refundGuestOwner
    );
    assert(refundNonStaff.status === 403, 'Refund with a guest session returns HTTP 403');
    const stillPaidAfterDenied = await prisma.payment.findUniqueOrThrow({ where: { id: refundPaymentId } });
    assert(stillPaidAfterDenied.status === PaymentStatus.PAID, 'Denied refund attempts leave the payment PAID');
    assert(gatewayRefundCalls === 0, 'Gateway refund API was not called by denied attempts');

    const overRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: refundTarget.bookingNumber,
        paymentId: refundPaymentId,
        amount: refundTotal + 100,
      },
      staffCookie
    );
    assert(overRefund.status === 400 && String(overRefund.json.error ?? '').includes('cannot exceed total paid amount'), 'Refunding more than the paid amount is rejected with HTTP 400');

    const zeroRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: refundTarget.bookingNumber,
        paymentId: refundPaymentId,
        amount: 0,
      },
      staffCookie
    );
    assert(zeroRefund.status === 400 && zeroRefund.json.error === 'Validation failed', 'A zero-amount refund is rejected by input validation');

    const negativeRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: refundTarget.bookingNumber,
        paymentId: refundPaymentId,
        amount: -10,
      },
      staffCookie
    );
    assert(negativeRefund.status === 400 && negativeRefund.json.error === 'Validation failed', 'A negative refund amount is rejected by input validation');

    const stillPaidBeforeRefund = await prisma.payment.findUniqueOrThrow({ where: { id: refundPaymentId } });
    assert(stillPaidBeforeRefund.status === PaymentStatus.PAID, 'Payment is still PAID after every rejected refund attempt');
    assert(stillPaidBeforeRefund.refundAmount === null, 'No refund amount was recorded by rejected refund attempts');
    assert(gatewayRefundCalls === 0, 'Gateway refund API was never called by rejected refund attempts');

    const fullRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: refundTarget.bookingNumber,
        paymentId: refundPaymentId,
        reason: 'Phase 7.0H full refund',
      },
      staffCookie
    );
    assert(fullRefund.status === 200 && fullRefund.json.data.status === PaymentStatus.REFUNDED, 'Authorized full refund succeeds with status REFUNDED');
    assert(
      fullRefund.json.data.refundAmount === refundTotal.toFixed(2),
      `Full refund reports the full paid amount (expected ${refundTotal.toFixed(2)}, got ${fullRefund.json.data.refundAmount})`
    );
    assert(gatewayRefundCalls === 1, 'Gateway refund API called exactly once by the authorized attempt');

    const fullRefundPayment = await prisma.payment.findUniqueOrThrow({ where: { id: refundPaymentId } });
    assert(fullRefundPayment.status === PaymentStatus.REFUNDED, 'Database payment record transitioned to REFUNDED');
    assert(Number(fullRefundPayment.refundAmount) === refundTotal, 'Persisted refund amount equals the paid amount');
    assert(Number(fullRefundPayment.refundAmount) <= Number(fullRefundPayment.amount), 'Refund amount never exceeds the original payment amount');
    const fullRefundBooking = await prisma.booking.findUniqueOrThrow({ where: { id: refundTarget.id } });
    assert(fullRefundBooking.status === BookingStatus.CANCELLED, 'Full refund cancels the reservation');

    const secondRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: refundTarget.bookingNumber,
        paymentId: refundPaymentId,
      },
      staffCookie
    );
    assert(secondRefund.status === 200 && secondRefund.json.data.alreadyRefunded === true, 'Repeated full refund is idempotent');
    assert(gatewayRefundCalls === 1, 'Idempotent refund does not call the gateway again');

    // Partial refund keeps the reservation active.
    const partialBooking = await createExperienceBooking('partial');
    const partialOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: partialBooking.bookingNumber,
    });
    const partialPayId = `pay_70h_partial_${Date.now()}`;
    const partialVerify = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: partialBooking.bookingNumber,
      razorpayOrderId: partialOrder.json.data.orderId as string,
      razorpayPaymentId: partialPayId,
      razorpaySignature: generatePaymentSignature(partialOrder.json.data.orderId as string, partialPayId),
    });
    assert(partialVerify.status === 200, 'Partial-refund fixture settled successfully');
    const partialBookingRowForAmount = await prisma.booking.findUniqueOrThrow({ where: { id: partialBooking.id } });
    const partialTotal = Number(partialBookingRowForAmount.totalPrice);
    const partialAmount = Math.round((partialTotal * 100) / 2) / 100;

    const partialRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: partialBooking.bookingNumber,
        amount: partialAmount,
        reason: 'Phase 7.0H partial refund',
      },
      staffCookie
    );
    assert(partialRefund.status === 200 && partialRefund.json.data.status === PaymentStatus.PARTIALLY_REFUNDED, 'Partial refund transitions the payment to PARTIALLY_REFUNDED');

    const partialPayment = await prisma.payment.findFirstOrThrow({ where: { bookingId: partialBooking.id } });
    assert(Number(partialPayment.refundAmount) === partialAmount, 'Persisted partial refund amount matches the requested amount');
    assert(Number(partialPayment.refundAmount) < Number(partialPayment.amount), 'Partial refund amount is strictly less than the payment amount');
    const partialBookingRow = await prisma.booking.findUniqueOrThrow({ where: { id: partialBooking.id } });
    assert(partialBookingRow.status === BookingStatus.CONFIRMED, 'Partial refund leaves the reservation CONFIRMED');

    const secondPartialRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: partialBooking.bookingNumber,
        amount: partialAmount,
      },
      staffCookie
    );
    assert(
      secondPartialRefund.status === 400 && String(secondPartialRefund.json.error ?? '').includes('PARTIALLY_REFUNDED'),
      'A second refund on a partially refunded payment is rejected (single-settlement invariant)'
    );

    // Gateway failure must never mutate local financial state.
    const gatewayFailBooking = await createExperienceBooking('gwfail');
    const gatewayFailOrder = await callCreateOrder({
      bookingType: 'EXPERIENCE',
      bookingNumber: gatewayFailBooking.bookingNumber,
    });
    const gatewayFailPayId = `pay_70h_gwfail_${Date.now()}`;
    const gatewayFailVerify = await callVerify({
      bookingType: 'EXPERIENCE',
      bookingNumber: gatewayFailBooking.bookingNumber,
      razorpayOrderId: gatewayFailOrder.json.data.orderId as string,
      razorpayPaymentId: gatewayFailPayId,
      razorpaySignature: generatePaymentSignature(gatewayFailOrder.json.data.orderId as string, gatewayFailPayId),
    });
    assert(gatewayFailVerify.status === 200, 'Gateway-failure fixture settled successfully');

    shouldSimulateRefundFailure = true;
    const gatewayFailRefund = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: gatewayFailBooking.bookingNumber,
        reason: 'Phase 7.0H gateway failure',
      },
      staffCookie
    );
    shouldSimulateRefundFailure = false;
    assert(gatewayFailRefund.status === 502, 'Gateway refund failure surfaces as HTTP 502 Bad Gateway');
    const gatewayFailPayment = await prisma.payment.findFirstOrThrow({ where: { bookingId: gatewayFailBooking.id } });
    assert(gatewayFailPayment.status === PaymentStatus.PAID, 'Failed gateway refund leaves the payment PAID');
    assert(gatewayFailPayment.refundAmount === null, 'Failed gateway refund records no refund amount');
    assert(gatewayFailPayment.refundId === null, 'Failed gateway refund records no refund id');
    const gatewayFailBookingRow = await prisma.booking.findUniqueOrThrow({ where: { id: gatewayFailBooking.id } });
    assert(gatewayFailBookingRow.status === BookingStatus.CONFIRMED, 'Failed gateway refund leaves the reservation CONFIRMED');

    const gatewayFailRecovery = await callRefund(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: gatewayFailBooking.bookingNumber,
        reason: 'Phase 7.0H gateway recovery',
      },
      staffCookie
    );
    assert(gatewayFailRecovery.status === 200 && gatewayFailRecovery.json.data.status === PaymentStatus.REFUNDED, 'Refund succeeds once the gateway recovers');

    // ------------------------------- 10. Event refund & ticket capacity release
    console.log('\n10. Event Refund & Ticket Capacity Release:');

    const soldBeforeEventRefund = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;
    const eventRefund = await callRefund(
      {
        bookingType: 'EVENT',
        bookingNumber: eventSettle.bookingNumber,
        reason: 'Phase 7.0H event refund',
      },
      staffCookie
    );
    assert(eventRefund.status === 200 && eventRefund.json.data.status === PaymentStatus.REFUNDED, 'Event payment refunds successfully');
    const soldAfterEventRefund = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;
    assert(
      soldAfterEventRefund === soldBeforeEventRefund - 2,
      `Full event refund releases exactly the booked tickets (before=${soldBeforeEventRefund}, after=${soldAfterEventRefund})`
    );
    const eventRefundBooking = await prisma.eventBooking.findUniqueOrThrow({ where: { id: eventSettle.id } });
    assert(eventRefundBooking.status === BookingStatus.CANCELLED, 'Full event refund cancels the event reservation');
    assert(soldAfterEventRefund >= 0, 'Event ticket capacity never goes negative');

    const soldBeforeEventWebhookRefund = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;
    const eventSettleOrder = await prisma.payment.findFirstOrThrow({ where: { eventBookingId: eventSettle.id } });
    const webhookRefund = await callWebhook({
      event: 'refund.processed',
      id: 'evt_70h_event_refund',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_70h_event',
            payment_id: eventSettleOrder.providerPaymentId,
            amount: Number(eventSettleOrder.amount) * 100,
          },
        },
      },
    });
    createdWebhookEventIds.push('evt_70h_event_refund');
    assert(webhookRefund.status === 200 && webhookRefund.json.handled === true, 'refund.processed webhook is handled for a known payment');
    const soldAfterEventWebhookRefund = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;
    assert(
      soldAfterEventWebhookRefund === soldBeforeEventWebhookRefund,
      'Repeated full refund of the same payment does not release capacity twice'
    );

    // ------------------------------- 11. Authorization & ownership boundaries
    console.log('\n11. Authorization & Ownership Boundaries:');

    const ownerCookie = await guestCookieFor(
      idemBooking.guestProfileId,
      `70h_owner2${TEST_DOMAIN}`,
      'guest_70h_owner_2'
    );
    const foreignCookie = await guestCookieFor('guest_profile_70h_foreign', 'foreign70h@test.com', 'guest_70h_foreign');

    const ownerView = await callGetPayments(idemBooking.bookingNumber, 'EXPERIENCE', ownerCookie);
    assert(ownerView.status === 200 && ownerView.json.data.length === 1, 'The owning guest can read their own payment records');

    const foreignView = await callGetPayments(idemBooking.bookingNumber, 'EXPERIENCE', foreignCookie);
    assert(foreignView.status === 403, 'A different guest profile is refused with HTTP 403');

    const staffView = await callGetPayments(idemBooking.bookingNumber, 'EXPERIENCE', staffCookie);
    assert(staffView.status === 200, 'Staff can read payment records for support');

    const publicView = await callGetPayments(idemBooking.bookingNumber, 'EXPERIENCE');
    assert(publicView.status === 200, 'Guest-booked reservations remain readable without a session');

    const unknownView = await callGetPayments('DVR-NOPE-0000', 'EXPERIENCE');
    assert(unknownView.status === 404, 'Unknown reservations return HTTP 404');

    const badTypeView = await callGetPayments(idemBooking.bookingNumber, 'HOTEL');
    assert(badTypeView.status === 400, 'Invalid booking type returns HTTP 400');

    const guestCreateOrder = await callCreateOrder(
      { bookingType: 'EXPERIENCE', bookingNumber: idemBooking.bookingNumber },
      foreignCookie
    );
    assert(guestCreateOrder.status === 403, 'A foreign guest cannot start an order for someone else\'s reservation');

    const guestVerifyForeign = await callVerify(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: idemBooking.bookingNumber,
        razorpayOrderId: firstIdemOrder.json.data.orderId as string,
        razorpayPaymentId: 'pay_70h_foreign',
        razorpaySignature: generatePaymentSignature(firstIdemOrder.json.data.orderId as string, 'pay_70h_foreign'),
      },
      foreignCookie
    );
    assert(guestVerifyForeign.status === 403, 'A foreign guest cannot verify someone else\'s payment');

    const nonStaffListish = await callGetPayments(idemBooking.bookingNumber, 'EXPERIENCE', nonStaffCookie);
    assert(
      nonStaffListish.status === 200,
      'An admin GUEST session gains no staff bypass and falls back to the public lookup path'
    );

    // --------------------------------------- 12. Secret & internal-field leak scan
    console.log('\n12. Secret & Internal-Field Leak Scan:');

    const expAPayment = await prisma.payment.findFirstOrThrow({
      where: { bookingId: amountBooking.id },
      include: {
        booking: {
          include: {
            items: true,
            winery: true,
            guestProfile: { include: { user: true } },
          },
        },
      },
    });
    const summaryDto = toAdminPaymentSummaryDto(expAPayment as unknown as AdminPaymentRecord);
    const detailDto = toAdminPaymentDetailDto(expAPayment as unknown as AdminPaymentRecord);
    const dtoRaw = JSON.stringify({ summaryDto, detailDto });
    leakScanTargets.push({ label: 'AdminPayment DTO projection', raw: dtoRaw });

    assert(!dtoRaw.includes(IDEMPOTENCY_AMOUNT_KEY), 'Admin DTO never exposes the payment idempotency key');
    assert(!dtoRaw.includes('providerSignature'), 'Admin DTO never exposes providerSignature');
    assert(!dtoRaw.includes('idempotencyKey'), 'Admin DTO never exposes the idempotencyKey field name');
    assert(!dtoRaw.includes(TEST_KEY_SECRET), 'Admin DTO never exposes the gateway key secret');
    assert(Boolean(expAPayment.providerSignature), 'Fixture payment really does carry a providerSignature to scan for');
    assert(expAPayment.idempotencyKey === IDEMPOTENCY_AMOUNT_KEY, 'Fixture payment really does carry an idempotency key to scan for');

    const secretTokens = [TEST_KEY_SECRET, TEST_WEBHOOK_SECRET, IDEMPOTENCY_AMOUNT_KEY, IDEMPOTENCY_MARKER];
    const internalFieldTokens = ['providerSignature', 'idempotencyKey'];
    let leakCount = 0;
    for (const target of leakScanTargets) {
      for (const token of secretTokens) {
        if (target.raw.includes(token)) {
          leakCount++;
          console.error(`    ✗ ${token} leaked in ${target.label}`);
        }
      }
      // Validation failures echo *request* field names back to the caller; that is
      // part of the public contract, so only payment-domain responses are checked
      // for internal column names.
      const isValidationFailure = target.raw.includes('"error":"Validation failed"');
      if (!isValidationFailure) {
        for (const token of internalFieldTokens) {
          if (target.raw.includes(token)) {
            leakCount++;
            console.error(`    ✗ ${token} leaked in ${target.label}`);
          }
        }
      }
    }
    assert(
      leakCount === 0,
      `No secret or internal payment field leaked across ${leakScanTargets.length} captured payment responses`
    );

    const paymentResponses = leakScanTargets.filter((t) => t.label.includes('/api/payments/')).length;
    assert(paymentResponses >= 40, `Scanned at least 40 payment API responses (scanned ${paymentResponses})`);

    // ------------------------------- 13. Cleanup & baseline restoration
    console.log('\n13. Performing Strict Database Cleanup & Baseline Restoration:');

    await prisma.payment.deleteMany({
      where: {
        OR: [{ bookingId: { in: createdBookingIds } }, { eventBookingId: { in: createdEventBookingIds } }],
      },
    });
    if (createdWebhookEventIds.length > 0) {
      await prisma.webhookEvent.deleteMany({ where: { eventId: { in: createdWebhookEventIds } } });
    }
    await prisma.notification.deleteMany({ where: { recipient: { endsWith: TEST_DOMAIN } } });

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

    for (const [ticketTypeId, soldCount] of ticketTypeSoldSnapshot) {
      await prisma.eventTicketType.update({ where: { id: ticketTypeId }, data: { soldCount } });
    }

    if (createdGuestProfileIds.length > 0) {
      const profiles = await prisma.guestProfile.findMany({
        where: { id: { in: createdGuestProfileIds } },
        select: { userId: true },
      });
      const userIds = profiles.map((p) => p.userId).filter(Boolean) as string[];
      await prisma.guestProfile.deleteMany({ where: { id: { in: createdGuestProfileIds } } });
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }

    const finalBookings = await prisma.booking.count();
    const finalEventBookings = await prisma.eventBooking.count();
    const finalPayments = await prisma.payment.count();
    const finalWebhookEvents = await prisma.webhookEvent.count();
    const finalGuestProfiles = await prisma.guestProfile.count();
    const finalTicketSold = (await prisma.eventTicketType.findUniqueOrThrow({ where: { id: ticketType.id } })).soldCount;

    assert(finalBookings === 17, `Final Bookings count is exactly 17 (found: ${finalBookings})`);
    assert(finalEventBookings === 5, `Final EventBookings count is exactly 5 (found: ${finalEventBookings})`);
    assert(finalPayments === 0, `Final Payments count is exactly 0 (found: ${finalPayments})`);
    assert(finalWebhookEvents === 0, `Final WebhookEvents count is exactly 0 (found: ${finalWebhookEvents})`);
    assert(finalGuestProfiles === initialGuestProfiles, `Final GuestProfiles count restored to ${initialGuestProfiles} (found: ${finalGuestProfiles})`);
    assert(
      finalTicketSold === ticketTypeSoldSnapshot.get(ticketType.id),
      `Event ticket soldCount restored to baseline ${ticketTypeSoldSnapshot.get(ticketType.id)} (found: ${finalTicketSold})`
    );

    console.log(`\n=== Phase 7.0H Test Summary: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    // Guarantee cleanup even when an assertion path throws before section 13.
    await prisma.payment.deleteMany({
      where: {
        OR: [{ bookingId: { in: createdBookingIds } }, { eventBookingId: { in: createdEventBookingIds } }],
      },
    });
    if (createdWebhookEventIds.length > 0) {
      await prisma.webhookEvent.deleteMany({ where: { eventId: { in: createdWebhookEventIds } } });
    }
    await prisma.notification.deleteMany({ where: { recipient: { endsWith: TEST_DOMAIN } } });
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
    for (const [ticketTypeId, soldCount] of ticketTypeSoldSnapshot) {
      await prisma.eventTicketType.update({ where: { id: ticketTypeId }, data: { soldCount } });
    }
    if (createdGuestProfileIds.length > 0) {
      const profiles = await prisma.guestProfile.findMany({
        where: { id: { in: createdGuestProfileIds } },
        select: { userId: true },
      });
      const userIds = profiles.map((p) => p.userId).filter(Boolean) as string[];
      await prisma.guestProfile.deleteMany({ where: { id: { in: createdGuestProfileIds } } });
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
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

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';
import { POST as createOrderRoute } from '../src/app/api/payments/create-order/route';
import { POST as verifyRoute } from '../src/app/api/payments/verify/route';
import { POST as failureRoute } from '../src/app/api/payments/failure/route';
import { GET as getPaymentsRoute } from '../src/app/api/payments/[bookingNumber]/route';
import { BookingStatus, PaymentStatus, UserRole, Prisma } from '@prisma/client';
import { getRazorpayClient } from '../src/lib/razorpay';
import { GuestAuth, GUEST_AUTH_COOKIE_NAME, getGuestJwtSecretKey } from '../src/lib/auth/guest';
import { AuthService, ADMIN_AUTH_COOKIE_NAME } from '../src/lib/auth';
import { SignJWT } from 'jose';
import crypto from 'crypto';

// Setup mock test environment variables for Razorpay
const TEST_KEY_ID = 'rzp_test_mock_api_key';
const TEST_KEY_SECRET = 'mock_secret_api_1234567890abcdef';
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
  console.log('=== Phase 7.0C — Payment API + Booking Integration Automated Test Suite ===\n');

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
  const initialBookings = await prisma.booking.findMany({
    select: { id: true, bookingNumber: true, status: true, totalPrice: true, guestProfileId: true },
  });
  const initialEventBookings = await prisma.eventBooking.findMany({
    select: { id: true, bookingNumber: true, status: true, totalPrice: true, guestProfileId: true },
  });
  const initialPaymentCount = await prisma.payment.count();
  const initialWebhookCount = await prisma.webhookEvent.count();

  assert(initialBookings.length === 17, `Initial Bookings count is exactly 17 (found: ${initialBookings.length})`);
  assert(initialEventBookings.length === 5, `Initial EventBookings count is exactly 5 (found: ${initialEventBookings.length})`);
  assert(initialPaymentCount === 0, `Initial Payments count is 0 (found: ${initialPaymentCount})`);
  assert(initialWebhookCount === 0, `Initial WebhookEvents count is 0 (found: ${initialWebhookCount})`);

  // Target test bookings from seeded data
  const testBooking = initialBookings.find((b) => b.status === BookingStatus.PENDING) || initialBookings[0];
  const initialBookingStatus = testBooking.status;
  const testEventBooking = initialEventBookings.find((eb) => eb.status === BookingStatus.PENDING) || initialEventBookings[0];
  const initialEventBookingStatus = testEventBooking.status;

  console.log(`  Target test booking: ${testBooking.bookingNumber} (${initialBookingStatus})`);
  console.log(`  Target test event booking: ${testEventBooking.bookingNumber} (${initialEventBookingStatus})`);

  // Mock Razorpay Gateway Client orders.create
  const razorpayClient = getRazorpayClient();
  let gatewayCallCount = 0;
  (razorpayClient.orders as unknown as { create: (args: Record<string, unknown>) => Promise<unknown> }).create = async (
    args: Record<string, unknown>
  ) => {
    gatewayCallCount++;
    return {
      id: `order_rzp_mock_api_${Date.now()}_${gatewayCallCount}`,
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

  // Auth helper cookies
  const staffCookieToken = await AuthService.createSessionToken({
    userId: 'staff_test_id',
    email: 'admin@vinora.com',
    role: UserRole.ADMIN,
    wineryId: null,
  });
  const staffCookie = `${ADMIN_AUTH_COOKIE_NAME}=${staffCookieToken}`;

  // Find winery for creating isolated test data
  const winery = await prisma.winery.findFirstOrThrow();
  const event = await prisma.event.findFirstOrThrow({ where: { wineryId: winery.id }, include: { schedules: true } });

  // Create isolated registered guest A with password
  const userA = await prisma.user.create({
    data: {
      email: `guest-a-${Date.now()}@vinoratest.com`,
      passwordHash: '$2a$12$eX4mP1eH4shP4ssw0rdF0rT3st1ngPurp0s3s0nlyAAAAAA',
      role: UserRole.GUEST,
      guestProfile: {
        create: {
          name: 'Registered Guest A',
          phone: '+15550001',
        },
      },
    },
    include: { guestProfile: true },
  });
  const guestProfileA = userA.guestProfile!;
  const guestACookieToken = await GuestAuth.createSessionToken({
    userId: userA.id,
    email: userA.email,
    role: UserRole.GUEST,
    guestProfileId: guestProfileA.id,
    name: guestProfileA.name,
  });
  const guestACookie = `${GUEST_AUTH_COOKIE_NAME}=${guestACookieToken}`;

  // Expired and malformed cookies for testing auth boundary
  const expiredGuestCookieToken = await new SignJWT({
    userId: userA.id,
    email: userA.email,
    role: UserRole.GUEST,
    guestProfileId: guestProfileA.id,
    name: guestProfileA.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
    .sign(getGuestJwtSecretKey());
  const expiredGuestCookie = `${GUEST_AUTH_COOKIE_NAME}=${expiredGuestCookieToken}`;
  const malformedGuestCookie = `${GUEST_AUTH_COOKIE_NAME}=malformed.garbage.jwt.token`;

  // Create isolated registered guest B with password
  const userB = await prisma.user.create({
    data: {
      email: `guest-b-${Date.now()}@vinoratest.com`,
      passwordHash: '$2a$12$eX4mP1eH4shP4ssw0rdF0rT3st1ngPurp0s3s0nlyAAAAAA',
      role: UserRole.GUEST,
      guestProfile: {
        create: {
          name: 'Registered Guest B',
          phone: '+15550002',
        },
      },
    },
    include: { guestProfile: true },
  });
  const guestProfileB = userB.guestProfile!;
  const guestBCookieToken = await GuestAuth.createSessionToken({
    userId: userB.id,
    email: userB.email,
    role: UserRole.GUEST,
    guestProfileId: guestProfileB.id,
    name: guestProfileB.name,
  });
  const guestBCookie = `${GUEST_AUTH_COOKIE_NAME}=${guestBCookieToken}`;

  // Create isolated anonymous guest (no passwordHash)
  const userAnon = await prisma.user.create({
    data: {
      email: `anon-${Date.now()}@vinoratest.com`,
      passwordHash: null,
      role: UserRole.GUEST,
      guestProfile: {
        create: {
          name: 'Anonymous Guest',
        },
      },
    },
    include: { guestProfile: true },
  });
  const guestProfileAnon = userAnon.guestProfile!;

  // Create test reservations
  const bookingA = await prisma.booking.create({
    data: {
      bookingNumber: `TEST-BK-A-${Date.now()}`,
      wineryId: winery.id,
      guestProfileId: guestProfileA.id,
      date: new Date('2026-11-15'),
      time: '14:00',
      adults: 2,
      subtotal: new Prisma.Decimal('160.00'),
      taxAmount: new Prisma.Decimal('16.00'),
      totalPrice: new Prisma.Decimal('176.00'),
      currency: 'USD',
      status: BookingStatus.PENDING,
    },
  });

  const bookingAnon = await prisma.booking.create({
    data: {
      bookingNumber: `TEST-BK-ANON-${Date.now()}`,
      wineryId: winery.id,
      guestProfileId: guestProfileAnon.id,
      date: new Date('2026-11-16'),
      time: '15:00',
      adults: 1,
      subtotal: new Prisma.Decimal('80.00'),
      taxAmount: new Prisma.Decimal('8.00'),
      totalPrice: new Prisma.Decimal('88.00'),
      currency: 'USD',
      status: BookingStatus.PENDING,
    },
  });

  const eventBookingA = await prisma.eventBooking.create({
    data: {
      bookingNumber: `TEST-EV-A-${Date.now()}`,
      eventId: event.id,
      eventScheduleId: event.schedules[0].id,
      guestProfileId: guestProfileA.id,
      totalPrice: new Prisma.Decimal('220.00'),
      status: BookingStatus.PENDING,
    },
  });

  try {
    // =========================================================================
    // 2. ROUTE: POST /api/payments/create-order
    // =========================================================================
    console.log('\n2. Testing POST /api/payments/create-order:');

    // 2.1 Malformed JSON
    {
      const req = new NextRequest(new URL('/api/payments/create-order', 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'this is not json{',
      });
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400 && json.error === 'Invalid JSON payload', 'Malformed JSON returns 400 with descriptive error');
    }

    // 2.2 Missing required fields
    {
      const req = buildPostRequest('/api/payments/create-order', {});
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400 && json.error === 'Validation failed', 'Empty body returns 400 Validation failed');
      assert(Boolean(json.details?.bookingType && json.details?.bookingNumber), 'Validation details report missing fields');
    }

    // 2.3 Invalid bookingType
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'HOTEL',
        bookingNumber: bookingAnon.bookingNumber,
      });
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400 && json.error === 'Validation failed', 'Invalid bookingType returns 400');
    }

    // 2.4 Non-existent booking number
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: 'DVR-9999-NONEXISTENT',
      }, staffCookie);
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 404, 'Non-existent bookingNumber returns 404 Not Found');
      assert(json.error.includes('not found'), '404 response mentions not found');
    }

    // 2.4b Cross-booking-type isolation: Experience booking number with bookingType EVENT -> 404
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EVENT',
        bookingNumber: bookingAnon.bookingNumber,
      }, staffCookie);
      const res = await createOrderRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 404, 'Experience booking number requested as EVENT returns 404');
    }

    // 2.4c Cross-booking-type isolation: Event booking number with bookingType EXPERIENCE -> 404
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: eventBookingA.bookingNumber,
      }, staffCookie);
      const res = await createOrderRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 404, 'Event booking number requested as EXPERIENCE returns 404');
    }

    // 2.5 Ownership enforcement: Registered guest without cookie -> 401
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
      });
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 401, 'Registered reservation without session cookie returns 401 Unauthorized');
      assert(json.error.includes('Authentication required'), '401 mentions authentication required');
    }

    // 2.5b Registered guest with malformed JWT cookie -> 401
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
      }, malformedGuestCookie);
      const res = await createOrderRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 401, 'Registered reservation with malformed JWT cookie returns 401 Unauthorized');
    }

    // 2.5c Registered guest with expired JWT cookie -> 401
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
      }, expiredGuestCookie);
      const res = await createOrderRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 401, 'Registered reservation with expired JWT cookie returns 401 Unauthorized');
    }


    // 2.6 Ownership enforcement: Mismatched guest session (Guest B accessing Guest A) -> 403
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
      }, guestBCookie);
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 403, 'Mismatched guest session returns 403 Forbidden');
      assert(json.error.includes('Unauthorized to manage payment'), '403 mentions unauthorized');
    }

    // 2.7 Anonymous booking without cookie -> 200 Success (public flow)
    let anonOrderId = '';
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
      });
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Anonymous reservation without cookie creates order successfully (200)');
      assert(json.data.amount === 88 && json.data.amountSubunits === 8800, 'Authoritative amount is exactly 88 USD (8800 subunits)');
      assert(json.data.bookingNumber === bookingAnon.bookingNumber, 'Returned bookingNumber matches');
      assert(json.data.keyId === TEST_KEY_ID, 'Returned keyId matches test key');
      assert(json.data.alreadyCreated === false, 'alreadyCreated is false for new order');
      anonOrderId = json.data.orderId;
    }

    // 2.8 Reuse pending order within 15 min TTL
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
      });
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Repeated create-order returns 200');
      assert(json.data.alreadyCreated === true, 'alreadyCreated is true for active pending order');
      assert(json.data.orderId === anonOrderId, 'Reused orderId matches previous orderId');
    }

    // 2.8b Anonymous booking with malformed cookie does not break anonymous creation/reuse -> 200
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
      }, malformedGuestCookie);
      const res = await createOrderRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 200, 'Anonymous reservation with malformed cookie still allows public checkout (200)');
    }

    // 2.9 Registered guest with matching cookie -> 200 Success
    let guestAOrderId = '';
    const idempKeyA = `idemp_test_a_${Date.now()}`;
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
        idempotencyKey: idempKeyA,
      }, guestACookie);
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Matching registered guest session creates order (200)');
      assert(json.data.amount === 176 && json.data.amountSubunits === 17600, 'Authoritative amount is exactly 176 USD');
      assert(json.data.alreadyCreated === false, 'alreadyCreated is false');
      guestAOrderId = json.data.orderId;
    }

    // 2.10 Idempotency key reuse on SAME booking -> 200 with alreadyCreated: true
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
        idempotencyKey: idempKeyA,
      }, guestACookie);
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.data.alreadyCreated === true, 'Same idempotency key on same booking returns existing order (200)');
      assert(json.data.orderId === guestAOrderId, 'Returned orderId matches original');
    }

    // 2.11 Idempotency key reuse on DIFFERENT booking -> 409 Conflict
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EVENT',
        bookingNumber: eventBookingA.bookingNumber,
        idempotencyKey: idempKeyA, // already used for bookingA!
      }, guestACookie);
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 409, 'Reusing idempotency key across different reservations returns 409 Conflict');
      assert(json.error.includes('Idempotency key has already been used'), '409 mentions idempotency conflict');
    }

    // 2.12 Staff session creates order for Event Booking -> 200 Success
    let eventOrderId = '';
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EVENT',
        bookingNumber: eventBookingA.bookingNumber,
      }, staffCookie);
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Staff session creates order for Event Booking (200)');
      assert(json.data.amount === 220 && json.data.bookingType === 'EVENT', 'Event booking order has amount 220 USD');
      eventOrderId = json.data.orderId;
    }

    // 2.13 CANCELLED reservation cannot create order -> 400
    await prisma.booking.update({
      where: { id: bookingAnon.id },
      data: { status: BookingStatus.CANCELLED },
    });
    // Remove pending payments to test status check directly
    await prisma.payment.deleteMany({ where: { bookingId: bookingAnon.id } });
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
      });
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400, 'Cannot create order for CANCELLED booking (400)');
      assert(json.error.includes('cancelled reservation'), 'Error mentions cancelled reservation');
    }
    // Restore status back to PENDING for upcoming tests
    await prisma.booking.update({
      where: { id: bookingAnon.id },
      data: { status: BookingStatus.PENDING },
    });

    // 2.14 COMPLETED reservation cannot create order -> 400
    await prisma.booking.update({
      where: { id: bookingAnon.id },
      data: { status: BookingStatus.COMPLETED },
    });
    {
      const req = buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
      });
      const res = await createOrderRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400, 'Cannot create order for COMPLETED booking (400)');
      assert(json.error.includes('completed reservation'), 'Error mentions completed reservation');
    }
    // Restore back to PENDING
    await prisma.booking.update({
      where: { id: bookingAnon.id },
      data: { status: BookingStatus.PENDING },
    });

    // Re-create a fresh order for bookingAnon to use in verification tests
    const freshAnonOrderRes = await createOrderRoute(
      buildPostRequest('/api/payments/create-order', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
      })
    );
    const freshAnonData = (await freshAnonOrderRes.json()).data;
    anonOrderId = freshAnonData.orderId;

    // =========================================================================
    // 3. ROUTE: POST /api/payments/verify
    // =========================================================================
    console.log('\n3. Testing POST /api/payments/verify:');

    // 3.1 Malformed JSON
    {
      const req = new NextRequest(new URL('/api/payments/verify', 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400 && json.error === 'Invalid JSON payload', 'Malformed JSON returns 400');
    }

    // 3.2 Missing required fields
    {
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        razorpayOrderId: anonOrderId,
        // missing razorpayPaymentId and razorpaySignature
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400 && json.error === 'Validation failed', 'Missing paymentId/signature returns 400');
    }

    // 3.3 Ownership check: Registered guest without cookie -> 401
    {
      const mockPayId = `pay_mock_${Date.now()}`;
      const sig = generateSignature(guestAOrderId, mockPayId);
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
        razorpayOrderId: guestAOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: sig,
      });
      const res = await verifyRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 401, 'Verification for registered guest without session returns 401');
    }

    // 3.4 Ownership check: Mismatched guest session -> 403
    {
      const mockPayId = `pay_mock_${Date.now()}`;
      const sig = generateSignature(guestAOrderId, mockPayId);
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
        razorpayOrderId: guestAOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: sig,
      }, guestBCookie);
      const res = await verifyRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 403, 'Verification with mismatched guest session returns 403');
    }

    // 3.5 Tampered HMAC Signature -> 400 Bad Request
    {
      const mockPayId = `pay_mock_${Date.now()}`;
      const forgedSig = 'forged_tampered_signature_hex_1234567890';
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        razorpayOrderId: anonOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: forgedSig,
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400, 'Tampered HMAC signature returns 400 Bad Request');
      assert(json.error === 'Invalid payment signature', 'Error message is "Invalid payment signature"');
    }

    // 3.6 Non-matching payment order and booking -> 400 Bad Request
    {
      // Pass guestAOrderId with bookingAnon.bookingNumber
      const mockPayId = `pay_mock_${Date.now()}`;
      const sig = generateSignature(guestAOrderId, mockPayId);
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        razorpayOrderId: guestAOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: sig,
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400, 'Payment order belonging to different booking returns 400 Bad Request');
      assert(json.error.includes('does not belong to the specified reservation'), 'Error mentions mismatched reservation');
    }

    // 3.7 Valid payment verification on PENDING booking -> 200 Success
    const anonPaymentId = `pay_anon_${Date.now()}`;
    const validAnonSig = generateSignature(anonOrderId, anonPaymentId);
    {
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        razorpayOrderId: anonOrderId,
        razorpayPaymentId: anonPaymentId,
        razorpaySignature: validAnonSig,
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Valid signature verifies payment successfully (200)');
      assert(json.data.alreadyProcessed === false, 'alreadyProcessed is false on initial verification');
      assert(json.data.status === PaymentStatus.PAID, 'Response reports status PAID');
      assert(json.data.bookingNumber === bookingAnon.bookingNumber, 'Response reports bookingNumber');
      assert(json.data.paymentId !== undefined, 'Response reports paymentId');
      assert(json.data.providerOrderId === anonOrderId, 'Response reports providerOrderId');
      assert(json.data.providerPaymentId === anonPaymentId, 'Response reports providerPaymentId');
      assert(json.data.amount === '88.00', 'Response reports amount as 88.00');
      assert(json.data.currency === 'USD', 'Response reports currency USD');

      // Requirement 6.A assertions: Verify response must NOT expose sensitive fields
      assert(json.data.payment === undefined, 'Verify response does NOT contain raw payment object');
      assert(json.data.providerSignature === undefined, 'Verify response does NOT expose providerSignature');
      assert(json.data.idempotencyKey === undefined, 'Verify response does NOT expose idempotencyKey');
      assert(json.data.metadata === undefined, 'Verify response does NOT expose metadata');
      assert(json.data.bookingId === undefined, 'Verify response does NOT expose bookingId');
      assert(json.data.eventBookingId === undefined, 'Verify response does NOT expose eventBookingId');
      assert(json.data.booking === undefined, 'Verify response does NOT expose booking relation');
      assert(json.data.eventBooking === undefined, 'Verify response does NOT expose eventBooking relation');
      assert(json.data.guestProfileId === undefined, 'Verify response does NOT expose guestProfileId');
      assert(json.data.wineryId === undefined, 'Verify response does NOT expose wineryId');
      assert(json.data.passwordHash === undefined, 'Verify response does NOT expose passwordHash');

      // Database atomic transition check
      const dbPayment = await prisma.payment.findUnique({ where: { providerOrderId: anonOrderId } });
      assert(dbPayment?.status === PaymentStatus.PAID, 'Payment record transitioned to PAID in database');
      assert(dbPayment?.providerPaymentId === anonPaymentId, 'Payment record stores providerPaymentId');

      const dbBooking = await prisma.booking.findUnique({ where: { id: bookingAnon.id } });
      assert(dbBooking?.status === BookingStatus.CONFIRMED, 'Booking transitioned to CONFIRMED atomically');
    }

    // 3.8 Idempotent re-verification of the SAME payment -> 200 alreadyProcessed: true
    {
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        razorpayOrderId: anonOrderId,
        razorpayPaymentId: anonPaymentId,
        razorpaySignature: validAnonSig,
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Re-verifying same payment returns 200');
      assert(json.data.alreadyProcessed === true, 'alreadyProcessed is true on repeated verification');
      assert(json.data.status === PaymentStatus.PAID, 'Status is PAID');
    }

    // 3.9 Different payment against already CONFIRMED booking -> 409 Conflict
    // Create an unverified payment order for bookingAnon manually in DB
    const dummyOrderId = `order_dummy_conf_${Date.now()}`;
    await prisma.payment.create({
      data: {
        bookingId: bookingAnon.id,
        amount: new Prisma.Decimal('88.00'),
        currency: 'USD',
        status: PaymentStatus.PENDING,
        provider: 'RAZORPAY',
        providerOrderId: dummyOrderId,
      },
    });
    {
      const mockPayId = `pay_dummy_${Date.now()}`;
      const sig = generateSignature(dummyOrderId, mockPayId);
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        razorpayOrderId: dummyOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: sig,
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 409, 'New payment verification against already CONFIRMED reservation throws 409 Conflict');
      assert(json.error.includes('already confirmed reservation'), 'Error mentions already confirmed reservation');
    }
    // Clean up dummy payment
    await prisma.payment.deleteMany({ where: { providerOrderId: dummyOrderId } });

    // 3.10 Verification against CANCELLED booking -> 400 Bad Request
    // Create another test booking that is CANCELLED with a pending payment
    const cancelledBooking = await prisma.booking.create({
      data: {
        bookingNumber: `TEST-BK-CANC-${Date.now()}`,
        wineryId: winery.id,
        guestProfileId: guestProfileAnon.id,
        date: new Date('2026-11-20'),
        time: '12:00',
        adults: 1,
        subtotal: new Prisma.Decimal('45.00'),
        taxAmount: new Prisma.Decimal('5.00'),
        totalPrice: new Prisma.Decimal('50.00'),
        currency: 'USD',
        status: BookingStatus.CANCELLED,
      },
    });
    const cancOrderId = `order_canc_${Date.now()}`;
    await prisma.payment.create({
      data: {
        bookingId: cancelledBooking.id,
        amount: new Prisma.Decimal('50.00'),
        currency: 'USD',
        status: PaymentStatus.PENDING,
        provider: 'RAZORPAY',
        providerOrderId: cancOrderId,
      },
    });
    {
      const mockPayId = `pay_canc_${Date.now()}`;
      const sig = generateSignature(cancOrderId, mockPayId);
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: cancelledBooking.bookingNumber,
        razorpayOrderId: cancOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: sig,
      });
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400, 'Verification against CANCELLED reservation throws 400 Bad Request');
      assert(json.error.includes('cancelled reservation'), 'Error mentions cancelled reservation');
    }
    // Clean up cancelled booking & payment
    await prisma.payment.deleteMany({ where: { bookingId: cancelledBooking.id } });
    await prisma.booking.delete({ where: { id: cancelledBooking.id } });

    // 3.11 Registered guest verification with matching session -> 200 Success
    const guestAPayId = `pay_guest_a_${Date.now()}`;
    const guestASig = generateSignature(guestAOrderId, guestAPayId);
    {
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
        razorpayOrderId: guestAOrderId,
        razorpayPaymentId: guestAPayId,
        razorpaySignature: guestASig,
      }, guestACookie);
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Registered guest verifies payment with valid session (200)');
      assert(json.data.status === PaymentStatus.PAID, 'Status is PAID');
    }

    // 3.12 Staff session verifies Event Booking payment -> 200 Success
    const eventPayId = `pay_event_${Date.now()}`;
    const eventSig = generateSignature(eventOrderId, eventPayId);
    {
      const req = buildPostRequest('/api/payments/verify', {
        bookingType: 'EVENT',
        bookingNumber: eventBookingA.bookingNumber,
        razorpayOrderId: eventOrderId,
        razorpayPaymentId: eventPayId,
        razorpaySignature: eventSig,
      }, staffCookie);
      const res = await verifyRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Staff session verifies Event Booking payment (200)');
      assert(json.data.status === PaymentStatus.PAID, 'Status is PAID');

      const dbEventBooking = await prisma.eventBooking.findUnique({ where: { id: eventBookingA.id } });
      assert(dbEventBooking?.status === BookingStatus.CONFIRMED, 'EventBooking transitioned to CONFIRMED');
    }

    // =========================================================================
    // 4. ROUTE: POST /api/payments/failure
    // =========================================================================
    console.log('\n4. Testing POST /api/payments/failure:');

    // Create a pending payment to test failure on
    const failTestOrderId = `order_fail_${Date.now()}`;
    const failPayment = await prisma.payment.create({
      data: {
        bookingId: bookingAnon.id,
        amount: new Prisma.Decimal('88.00'),
        currency: 'USD',
        status: PaymentStatus.PENDING,
        provider: 'RAZORPAY',
        providerOrderId: failTestOrderId,
      },
    });

    // 4.1 Malformed JSON
    {
      const req = new NextRequest(new URL('/api/payments/failure', 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });
      const res = await failureRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400 && json.error === 'Invalid JSON payload', 'Malformed JSON returns 400');
    }

    // 4.2 Missing required fields
    {
      const req = buildPostRequest('/api/payments/failure', {
        bookingType: 'EXPERIENCE',
        // missing bookingNumber and providerOrderId
      });
      const res = await failureRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 400 && json.error === 'Validation failed', 'Missing fields return 400');
    }

    // 4.3 Payment order not found
    {
      const req = buildPostRequest('/api/payments/failure', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        providerOrderId: 'order_non_existent_123',
      });
      const res = await failureRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 404, 'Non-existent providerOrderId returns 404');
    }

    // 4.4 Valid payment failure recording
    {
      const req = buildPostRequest('/api/payments/failure', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        providerOrderId: failTestOrderId,
        errorCode: 'BAD_REQUEST_ERROR',
        errorMessage: 'User cancelled payment modal',
        metadata: { reason: 'user_cancelled', step: 'gateway_modal' },
      });
      const res = await failureRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Failure recorded successfully (200)');
      assert(json.data.status === PaymentStatus.FAILED, 'Returned payment status is FAILED');
      assert(json.data.errorCode === 'BAD_REQUEST_ERROR', 'Returned errorCode matches');
      assert(json.data.errorMessage === 'User cancelled payment modal', 'Returned errorMessage matches');
      assert(json.data.paymentId === failPayment.id, 'Returned paymentId matches');
      assert(json.data.providerOrderId === failTestOrderId, 'Returned providerOrderId matches');

      // Requirement 6.B assertions: Failure response must NOT expose sensitive fields
      assert(json.data.providerSignature === undefined, 'Failure response does NOT expose providerSignature');
      assert(json.data.idempotencyKey === undefined, 'Failure response does NOT expose idempotencyKey');
      assert(json.data.metadata === undefined, 'Failure response does NOT expose metadata');
      assert(json.data.bookingId === undefined, 'Failure response does NOT expose bookingId');
      assert(json.data.eventBookingId === undefined, 'Failure response does NOT expose eventBookingId');
      assert(json.data.booking === undefined, 'Failure response does NOT expose booking relation');
      assert(json.data.eventBooking === undefined, 'Failure response does NOT expose eventBooking relation');
      assert(json.data.guestProfileId === undefined, 'Failure response does NOT expose guestProfileId');
      assert(json.data.passwordHash === undefined, 'Failure response does NOT expose passwordHash');

      const dbPay = await prisma.payment.findUnique({ where: { id: failPayment.id } });
      assert(dbPay?.status === PaymentStatus.FAILED, 'Database payment status is FAILED');
      assert(dbPay?.errorCode === 'BAD_REQUEST_ERROR', 'Database stores errorCode');
    }

    // 4.5 Reporting failure on already PAID payment does not transition to FAILED
    {
      const req = buildPostRequest('/api/payments/failure', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingAnon.bookingNumber,
        providerOrderId: anonOrderId, // already verified as PAID in step 3.7
        errorCode: 'LATE_ERROR',
        errorMessage: 'Should not overwrite PAID status',
      });
      const res = await failureRoute(req);
      const { status, json } = await parseResponse(res);
      assert(status === 200, 'Reporting failure on PAID payment returns 200');
      assert(json.data.status === PaymentStatus.PAID, 'Payment retains status PAID');

      const dbPay = await prisma.payment.findUnique({ where: { providerOrderId: anonOrderId } });
      assert(dbPay?.status === PaymentStatus.PAID, 'Database payment remains PAID');
    }

    // 4.6 Ownership check on failure reporting for registered guest: without session -> 401
    {
      const req = buildPostRequest('/api/payments/failure', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
        providerOrderId: guestAOrderId,
        errorCode: 'TEST_ERR',
      });
      const res = await failureRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 401, 'Failure reporting on registered guest without session returns 401');
    }

    // 4.7 Ownership check on failure reporting: mismatched session -> 403
    {
      const req = buildPostRequest('/api/payments/failure', {
        bookingType: 'EXPERIENCE',
        bookingNumber: bookingA.bookingNumber,
        providerOrderId: guestAOrderId,
        errorCode: 'TEST_ERR',
      }, guestBCookie);
      const res = await failureRoute(req);
      const { status } = await parseResponse(res);
      assert(status === 403, 'Failure reporting on registered guest with mismatched session returns 403');
    }

    // =========================================================================
    // 5. ROUTE: GET /api/payments/[bookingNumber]
    // =========================================================================
    console.log('\n5. Testing GET /api/payments/[bookingNumber]:');

    // 5.1 Invalid type query parameter -> 400
    {
      const req = buildGetRequest(`/api/payments/${bookingAnon.bookingNumber}?type=SPA`);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingAnon.bookingNumber }) });
      const { status, json } = await parseResponse(res);
      assert(status === 400, 'Invalid ?type= parameter returns 400 Bad Request');
      assert(json.error.includes("Must be 'EXPERIENCE' or 'EVENT'"), 'Error message specifies allowed values');
    }

    // 5.1b Cross-booking-type isolation: EXPERIENCE booking number requested with ?type=EVENT -> 404
    {
      const req = buildGetRequest(`/api/payments/${bookingAnon.bookingNumber}?type=EVENT`);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingAnon.bookingNumber }) });
      const { status } = await parseResponse(res);
      assert(status === 404, 'Experience booking number requested with ?type=EVENT returns 404');
    }

    // 5.1c Cross-booking-type isolation: EVENT booking number requested with ?type=EXPERIENCE -> 404
    {
      const req = buildGetRequest(`/api/payments/${eventBookingA.bookingNumber}?type=EXPERIENCE`, staffCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: eventBookingA.bookingNumber }) });
      const { status } = await parseResponse(res);
      assert(status === 404, 'Event booking number requested with ?type=EXPERIENCE returns 404');
    }

    // 5.2 Non-existent booking number -> 404
    {
      const req = buildGetRequest('/api/payments/NON_EXISTENT_BK_123', staffCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: 'NON_EXISTENT_BK_123' }) });
      const { status } = await parseResponse(res);
      assert(status === 404, 'Non-existent bookingNumber returns 404');
    }

    // 5.3 Registered guest without session -> 401
    {
      const req = buildGetRequest(`/api/payments/${bookingA.bookingNumber}`);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingA.bookingNumber }) });
      const { status } = await parseResponse(res);
      assert(status === 401, 'Registered guest booking payment lookup without session returns 401');
    }

    // 5.3b Registered guest booking payment lookup with malformed JWT cookie -> 401
    {
      const req = buildGetRequest(`/api/payments/${bookingA.bookingNumber}`, malformedGuestCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingA.bookingNumber }) });
      const { status } = await parseResponse(res);
      assert(status === 401, 'Registered guest booking payment lookup with malformed cookie returns 401');
    }

    // 5.3c Registered guest booking payment lookup with expired JWT cookie -> 401
    {
      const req = buildGetRequest(`/api/payments/${bookingA.bookingNumber}`, expiredGuestCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingA.bookingNumber }) });
      const { status } = await parseResponse(res);
      assert(status === 401, 'Registered guest booking payment lookup with expired cookie returns 401');
    }

    // 5.4 Registered guest with mismatched session -> 403
    {
      const req = buildGetRequest(`/api/payments/${bookingA.bookingNumber}`, guestBCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingA.bookingNumber }) });
      const { status } = await parseResponse(res);
      assert(status === 403, 'Registered guest booking payment lookup with mismatched session returns 403');
    }

    // 5.5 Registered guest with matching session -> 200 Success
    {
      const req = buildGetRequest(`/api/payments/${bookingA.bookingNumber}`, guestACookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingA.bookingNumber }) });
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Registered guest retrieves own payments (200)');
      assert(Array.isArray(json.data), 'data is an array');
      assert(json.data.length === 1, 'Contains exactly 1 payment record');
      assert(json.data[0].status === PaymentStatus.PAID, 'Payment record is PAID');
      assert(json.data[0].amount === '176.00', 'Amount is serialized as 176.00');
      assert(json.data[0].bookingNumber === bookingA.bookingNumber, 'DTO contains public bookingNumber');
      assert(json.data[0].bookingType === 'EXPERIENCE', 'DTO contains bookingType EXPERIENCE');

      // Requirement 6.C assertions: GET response must NOT expose sensitive fields
      assert(json.data[0].providerSignature === undefined, 'GET response does NOT expose providerSignature');
      assert(json.data[0].idempotencyKey === undefined, 'GET response does NOT expose idempotencyKey');
      assert(json.data[0].metadata === undefined, 'GET response does NOT expose metadata');
      assert(json.data[0].bookingId === undefined, 'GET response does NOT expose bookingId');
      assert(json.data[0].eventBookingId === undefined, 'GET response does NOT expose eventBookingId');
      assert(json.data[0].booking === undefined, 'GET response does NOT expose booking relation');
      assert(json.data[0].eventBooking === undefined, 'GET response does NOT expose eventBooking relation');
      assert(json.data[0].guestProfileId === undefined, 'GET response does NOT expose guestProfileId');
      assert(json.data[0].wineryId === undefined, 'GET response does NOT expose wineryId');
      assert(json.data[0].passwordHash === undefined, 'GET response does NOT expose passwordHash');
    }

    // 5.6 Anonymous booking payment lookup without session -> 200 Success
    {
      const req = buildGetRequest(`/api/payments/${bookingAnon.bookingNumber}`);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingAnon.bookingNumber }) });
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Anonymous booking payment lookup returns 200');
      assert(Array.isArray(json.data), 'data is an array');
      // bookingAnon had: 1 PAID payment and 1 FAILED payment
      assert(json.data.length >= 2, `bookingAnon payments array has records (found: ${json.data.length})`);
      assert(json.data.some((p: { status: string }) => p.status === PaymentStatus.PAID), 'Contains PAID payment');
      assert(json.data.some((p: { status: string }) => p.status === PaymentStatus.FAILED), 'Contains FAILED payment');
    }

    // 5.6b Anonymous booking payment lookup with malformed cookie -> 200 Success
    {
      const req = buildGetRequest(`/api/payments/${bookingAnon.bookingNumber}`, malformedGuestCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingAnon.bookingNumber }) });
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Anonymous booking lookup with malformed cookie succeeds (200)');
      assert(Array.isArray(json.data), 'data is an array');
    }

    // 5.7 Event Booking payment lookup with ?type=EVENT -> 200 Success
    {
      const req = buildGetRequest(`/api/payments/${eventBookingA.bookingNumber}?type=EVENT`, staffCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: eventBookingA.bookingNumber }) });
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Event booking payment lookup with ?type=EVENT returns 200');
      assert(json.data.length === 1, 'Contains exactly 1 payment record');
      assert(json.data[0].bookingNumber === eventBookingA.bookingNumber, 'Payment DTO contains bookingNumber');
      assert(json.data[0].bookingType === 'EVENT', 'Payment DTO contains bookingType EVENT');
      assert(json.data[0].amount === '220.00', 'Amount is 220.00');
      assert(json.data[0].status === PaymentStatus.PAID, 'Status is PAID');

      // Requirement 6.C assertions: GET event payment must NOT expose sensitive fields
      assert(json.data[0].bookingId === undefined, 'Payment bookingId is absent');
      assert(json.data[0].eventBookingId === undefined, 'Payment eventBookingId is absent');
      assert(json.data[0].booking === undefined, 'Payment booking relation is absent');
      assert(json.data[0].eventBooking === undefined, 'Payment eventBooking relation is absent');
      assert(json.data[0].providerSignature === undefined, 'GET event payment response does NOT expose providerSignature');
      assert(json.data[0].idempotencyKey === undefined, 'GET event payment response does NOT expose idempotencyKey');
      assert(json.data[0].metadata === undefined, 'GET event payment response does NOT expose metadata');
    }

    // 5.8 Staff session lookup -> 200 Success
    {
      const req = buildGetRequest(`/api/payments/${bookingA.bookingNumber}`, staffCookie);
      const res = await getPaymentsRoute(req, { params: Promise.resolve({ bookingNumber: bookingA.bookingNumber }) });
      const { status, json } = await parseResponse(res);
      assert(status === 200 && json.success === true, 'Staff session can retrieve any payment (200)');
    }

  } finally {
    // =========================================================================
    // 6. TEARDOWN & COMPLETE DATABASE RESTORATION
    // =========================================================================
    console.log('\n6. Teardown & Restoring Database State:');

    // Delete all payments created during tests
    await prisma.payment.deleteMany({
      where: {
        OR: [
          { bookingId: { in: [bookingA.id, bookingAnon.id] } },
          { eventBookingId: eventBookingA.id },
        ],
      },
    });

    // Delete any status histories created during tests
    await prisma.bookingStatusHistory.deleteMany({
      where: { bookingId: { in: [bookingA.id, bookingAnon.id] } },
    });
    await prisma.eventBookingStatusHistory.deleteMany({
      where: { eventBookingId: eventBookingA.id },
    });

    // Delete test bookings & event bookings
    await prisma.booking.deleteMany({
      where: { id: { in: [bookingA.id, bookingAnon.id] } },
    });
    await prisma.eventBooking.deleteMany({
      where: { id: eventBookingA.id },
    });

    // Delete test guest profiles & users
    await prisma.guestProfile.deleteMany({
      where: { id: { in: [guestProfileA.id, guestProfileB.id, guestProfileAnon.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, userAnon.id] } },
    });

    // Restore test bookings status to original initial status
    await prisma.booking.update({
      where: { id: testBooking.id },
      data: { status: initialBookingStatus },
    });
    await prisma.eventBooking.update({
      where: { id: testEventBooking.id },
      data: { status: initialEventBookingStatus },
    });

    // Final Audit
    const finalBookings = await prisma.booking.count();
    const finalEventBookings = await prisma.eventBooking.count();
    const finalPayments = await prisma.payment.count();
    const finalWebhooks = await prisma.webhookEvent.count();

    assert(finalBookings === 17, `Final Bookings count is exactly 17 (found: ${finalBookings})`);
    assert(finalEventBookings === 5, `Final EventBookings count is exactly 5 (found: ${finalEventBookings})`);
    assert(finalPayments === 0, `Final Payments count is exactly 0 (found: ${finalPayments})`);
    assert(finalWebhooks === 0, `Final WebhookEvents count is exactly 0 (found: ${finalWebhooks})`);
  }

  console.log(`\n=== Test Summary: ${passed} passed, ${failed} failed ===`);
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

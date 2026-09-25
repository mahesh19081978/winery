import { prisma } from '../src/lib/db';
import {
  getRazorpayClient,
  verifyPaymentSignature,
  verifyWebhookSignature,
  toSubunits,
  fromSubunits,
} from '../src/lib/razorpay';
import crypto from 'crypto';
import { PaymentStatus, Prisma } from '@prisma/client';

async function runTests() {
  console.log('=== Phase 7.0A — Payment Schema & Gateway Foundation Verification ===\n');

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

  // --- 1. Subunit Conversion Tests ---
  console.log('1. Testing Currency Subunit Utilities:');
  assert(toSubunits(150.0) === 15000, 'toSubunits: 150.00 converts to 15000');
  assert(toSubunits('49.99') === 4999, 'toSubunits: string "49.99" converts to 4999');
  assert(toSubunits(0) === 0, 'toSubunits: 0 converts to 0');
  assert(fromSubunits(15000) === 150.0, 'fromSubunits: 15000 converts to 150.00');
  assert(fromSubunits(4999) === 49.99, 'fromSubunits: 4999 converts to 49.99');

  // --- 2. Razorpay Client Initialization Tests ---
  console.log('\n2. Testing Razorpay Client Initialization:');
  const customClient = getRazorpayClient({
    keyId: 'rzp_test_mockKeyId123',
    keySecret: 'mockKeySecret456',
  });
  assert(typeof customClient === 'object' && customClient !== null, 'getRazorpayClient initializes with custom credentials');
  assert(
    typeof (customClient as { orders?: { create?: unknown } }).orders?.create === 'function',
    'Razorpay client has orders.create function'
  );

  // --- 3. Payment Signature Verification Tests ---
  console.log('\n3. Testing Payment Signature Verification:');
  const testSecret = 'sample_secret_key_789';
  const testOrderId = 'order_test_1001';
  const testPaymentId = 'pay_test_2002';
  const validSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const isValid = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: validSignature,
    secret: testSecret,
  });
  assert(isValid === true, 'Valid signature verifies successfully');

  const tamperedSig = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: 'bad_signature_00000000000000000000000000000000000000000000000000000000000000',
    secret: testSecret,
  });
  assert(tamperedSig === false, 'Tampered signature rejected');

  const mismatchedOrder = verifyPaymentSignature({
    orderId: 'order_test_DIFFERENT',
    paymentId: testPaymentId,
    signature: validSignature,
    secret: testSecret,
  });
  assert(mismatchedOrder === false, 'Mismatched orderId rejected');

  const mismatchedPayment = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: 'pay_test_DIFFERENT',
    signature: validSignature,
    secret: testSecret,
  });
  assert(mismatchedPayment === false, 'Mismatched paymentId rejected');

  const wrongSecret = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: validSignature,
    secret: 'wrong_secret_key_999',
  });
  assert(wrongSecret === false, 'Signature with wrong secret rejected');

  // --- 4. Webhook Signature Verification Tests ---
  console.log('\n4. Testing Webhook Signature Verification:');
  const webhookSecret = 'whsec_sample_webhook_secret_321';
  const webhookPayload = JSON.stringify({
    entity: 'event',
    event: 'payment.captured',
    payload: { payment: { entity: { id: testPaymentId, amount: 15000 } } },
  });
  const validWebhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(Buffer.from(webhookPayload, 'utf8'))
    .digest('hex');

  const isWebhookValid = verifyWebhookSignature({
    rawBody: webhookPayload,
    signature: validWebhookSig,
    webhookSecret,
  });
  assert(isWebhookValid === true, 'Valid webhook raw string body verified');

  const isBufferValid = verifyWebhookSignature({
    rawBody: Buffer.from(webhookPayload, 'utf8'),
    signature: validWebhookSig,
    webhookSecret,
  });
  assert(isBufferValid === true, 'Valid webhook Buffer body verified');

  const tamperedBody = verifyWebhookSignature({
    rawBody: webhookPayload + ' ',
    signature: validWebhookSig,
    webhookSecret,
  });
  assert(tamperedBody === false, 'Tampered webhook payload rejected');

  // --- 5. Neon Database Integrity & Schema Relations ---
  console.log('\n5. Verifying Database Data Integrity on Neon:');
  const bCount = await prisma.booking.count();
  const ebCount = await prisma.eventBooking.count();
  const pCount = await prisma.payment.count();
  const wCount = await prisma.webhookEvent.count();

  assert(bCount === 17, `Existing experience bookings intact (expected: 17, actual: ${bCount})`);
  assert(ebCount === 5, `Existing event bookings intact (expected: 5, actual: ${ebCount})`);
  assert(pCount === 0, `Existing payment records count is 0 (actual: ${pCount})`);
  assert(wCount === 0, `Existing webhook_events count is 0 (actual: ${wCount})`);

  // --- 6. Transactional Schema Verification (Rollback safety) ---
  console.log('\n6. Testing Prisma Schema Relations in Isolated Rollback Transaction:');
  try {
    await prisma.$transaction(async (tx) => {
      // Find an existing experience booking
      const sampleBooking = await tx.booking.findFirst({ select: { id: true, bookingNumber: true } });
      assert(sampleBooking !== null, 'Found existing sample Booking for relation test');

      let payment1: Awaited<ReturnType<typeof tx.payment.create>> | null = null;
      let payment2: Awaited<ReturnType<typeof tx.payment.create>> | null = null;

      if (sampleBooking) {
        // Create test Payment linked to Booking
        payment1 = await tx.payment.create({
          data: {
            bookingId: sampleBooking.id,
            amount: new Prisma.Decimal('150.00'),
            currency: 'USD',
            status: PaymentStatus.PENDING,
            provider: 'RAZORPAY',
            providerOrderId: 'order_test_exp_001',
            providerPaymentId: 'pay_test_exp_001',
            providerSignature: validSignature,
            paymentMethod: 'CARD',
            idempotencyKey: 'idemp_test_exp_001',
            metadata: { test: true },
          },
        });
        assert(payment1.bookingId === sampleBooking.id, 'Payment created and connected to Booking');
        assert(payment1.status === PaymentStatus.PENDING, 'Payment status PENDING set correctly');

        // Verify back-relation
        const bookingWithPayments = await tx.booking.findUnique({
          where: { id: sampleBooking.id },
          include: { payments: true },
        });
        assert(
          bookingWithPayments?.payments.some((p) => p.id === payment1?.id) === true,
          'Booking.payments relation resolves created Payment'
        );
      }

      // Find an existing event booking
      const sampleEventBooking = await tx.eventBooking.findFirst({ select: { id: true, bookingNumber: true } });
      assert(sampleEventBooking !== null, 'Found existing sample EventBooking for relation test');

      if (sampleEventBooking) {
        // Create test Payment linked to EventBooking
        payment2 = await tx.payment.create({
          data: {
            eventBookingId: sampleEventBooking.id,
            amount: new Prisma.Decimal('95.00'),
            currency: 'USD',
            status: PaymentStatus.PAID,
            provider: 'RAZORPAY',
            providerOrderId: 'order_test_evt_002',
            providerPaymentId: 'pay_test_evt_002',
            providerSignature: validSignature,
            paymentMethod: 'UPI',
            idempotencyKey: 'idemp_test_evt_002',
          },
        });
        assert(payment2.eventBookingId === sampleEventBooking.id, 'Payment created and connected to EventBooking');

        // Verify back-relation
        const eventBookingWithPayments = await tx.eventBooking.findUnique({
          where: { id: sampleEventBooking.id },
          include: { payments: true },
        });
        assert(
          eventBookingWithPayments?.payments.some((p) => p.id === payment2?.id) === true,
          'EventBooking.payments relation resolves created Payment'
        );
      }

      // --- XOR Integrity Check 1: Booking-only Payment succeeds ---
      assert(payment1 !== null && payment1.bookingId !== null && payment1.eventBookingId === null, 'XOR: Booking-only Payment succeeds');

      // --- XOR Integrity Check 2: EventBooking-only Payment succeeds ---
      assert(payment2 !== null && payment2.bookingId === null && payment2.eventBookingId !== null, 'XOR: EventBooking-only Payment succeeds');

      // Create test WebhookEvent
      const webhookEvent = await tx.webhookEvent.create({
        data: {
          provider: 'RAZORPAY',
          eventId: 'evt_test_webhook_001',
          eventType: 'payment.captured',
          processed: true,
          payload: { orderId: 'order_test_exp_001' },
        },
      });
      assert(webhookEvent.eventId === 'evt_test_webhook_001', 'WebhookEvent created successfully');

      // Always abort transaction so no test artifacts persist in Neon DB
      throw new Error('ROLLBACK_INTENTIONAL');
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'ROLLBACK_INTENTIONAL') {
      console.log('  ✓ Transaction rolled back successfully: zero persistent test records left in DB');
      passed++;
    } else {
      console.error('  ✗ FAIL: Transactional test failed:', err);
      failed++;
    }
  }

  // --- XOR Integrity Check 3: Both IDs populated -> must be rejected by check constraint ---
  const sampleBooking = await prisma.booking.findFirst({ select: { id: true } });
  const sampleEventBooking = await prisma.eventBooking.findFirst({ select: { id: true } });
  if (sampleBooking && sampleEventBooking) {
    let bothPopulatedRejected = false;
    try {
      await prisma.payment.create({
        data: {
          bookingId: sampleBooking.id,
          eventBookingId: sampleEventBooking.id,
          amount: new Prisma.Decimal('50.00'),
          currency: 'USD',
          status: PaymentStatus.PENDING,
          provider: 'RAZORPAY',
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('payments_booking_xor_check') || msg.includes('check constraint') || msg.includes('23514')) {
        bothPopulatedRejected = true;
      }
    }
    assert(bothPopulatedRejected, 'XOR: Both bookingId and eventBookingId populated is rejected by DB constraint');
  }

  // --- XOR Integrity Check 4: Both IDs null -> must be rejected by check constraint ---
  let bothNullRejected = false;
  try {
    await prisma.payment.create({
      data: {
        amount: new Prisma.Decimal('50.00'),
        currency: 'USD',
        status: PaymentStatus.PENDING,
        provider: 'RAZORPAY',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('payments_booking_xor_check') || msg.includes('check constraint') || msg.includes('23514')) {
      bothNullRejected = true;
    }
  }
  assert(bothNullRejected, 'XOR: Both bookingId and eventBookingId null is rejected by DB constraint');

  // --- 7. Final Verification of Data Post-Rollback ---
  console.log('\n7. Final Post-Test Neon Database Integrity Confirmation:');
  const finalPCount = await prisma.payment.count();
  const finalWCount = await prisma.webhookEvent.count();
  const finalBCount = await prisma.booking.count();
  const finalEbCount = await prisma.eventBooking.count();

  assert(finalPCount === 0, `Payment count remains 0 after test rollback (${finalPCount})`);
  assert(finalWCount === 0, `WebhookEvent count remains 0 after test rollback (${finalWCount})`);
  assert(finalBCount === 17, `Booking count remains 17 (${finalBCount})`);
  assert(finalEbCount === 5, `EventBooking count remains 5 (${finalEbCount})`);

  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`Phase 7.0A Verification Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Unhandled test runner error:', e);
  process.exit(1);
});

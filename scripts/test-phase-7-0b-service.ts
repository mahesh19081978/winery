import { prisma } from '../src/lib/db';
import {
  PaymentRepository,
  WebhookRepository,
} from '../src/server/repositories';
import {
  PaymentService,
  PaymentError,
} from '../src/server/services';
import {
  PaymentOrderCreateSchema,
  PaymentVerifySchema,
  PaymentFailureSchema,
} from '../src/server/validators';
import {
  PaymentStatus,
  BookingStatus,
  Prisma,
} from '@prisma/client';
import { getRazorpayClient } from '../src/lib/razorpay';
import crypto from 'crypto';

// Setup mock test environment variables for Razorpay
const TEST_KEY_ID = 'rzp_test_mock_key_12345';
const TEST_KEY_SECRET = 'mock_secret_abcdef1234567890';
process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

async function runTests() {
  console.log('=== Phase 7.0B — Payment Repository & Service Automated Test Suite ===\n');

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

  // 1. Initial Database Audit
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

  // Target test booking (choose a PENDING booking if possible, or remember initial status)
  const testBooking = initialBookings.find((b) => b.status === BookingStatus.PENDING) || initialBookings[0];
  const initialTestBookingStatus = testBooking.status;
  const testEventBooking = initialEventBookings.find((eb) => eb.status === BookingStatus.PENDING) || initialEventBookings[0];
  const initialTestEventBookingStatus = testEventBooking.status;

  console.log(`  Target test booking: ${testBooking.bookingNumber} (${initialTestBookingStatus})`);
  console.log(`  Target test event booking: ${testEventBooking.bookingNumber} (${initialTestEventBookingStatus})`);

  // 2. Validation Schemas Unit Tests
  console.log('\n2. Testing Validation Schemas (Zod):');
  const validOrderInput = {
    bookingType: 'EXPERIENCE',
    bookingNumber: testBooking.bookingNumber,
    idempotencyKey: 'idemp_key_12345678',
  };
  const orderParseResult = PaymentOrderCreateSchema.safeParse(validOrderInput);
  assert(orderParseResult.success, 'PaymentOrderCreateSchema parses valid input');

  const invalidOrderInput = {
    bookingType: 'INVALID_TYPE',
    bookingNumber: '',
  };
  const invalidOrderResult = PaymentOrderCreateSchema.safeParse(invalidOrderInput);
  assert(!invalidOrderResult.success, 'PaymentOrderCreateSchema rejects invalid bookingType and empty bookingNumber');

  const validVerifyInput = {
    bookingType: 'EXPERIENCE',
    bookingNumber: testBooking.bookingNumber,
    razorpayOrderId: 'order_12345',
    razorpayPaymentId: 'pay_67890',
    razorpaySignature: 'mock_sig_abc',
  };
  assert(PaymentVerifySchema.safeParse(validVerifyInput).success, 'PaymentVerifySchema parses valid input');

  const invalidVerifyInput = {
    bookingType: 'EXPERIENCE',
    bookingNumber: testBooking.bookingNumber,
    razorpayOrderId: 'order_12345',
    // missing paymentId and signature
  };
  assert(!PaymentVerifySchema.safeParse(invalidVerifyInput).success, 'PaymentVerifySchema rejects missing paymentId and signature');

  const validFailureInput = {
    bookingType: 'EVENT',
    bookingNumber: testEventBooking.bookingNumber,
    providerOrderId: 'order_12345',
    errorCode: 'BAD_REQUEST_ERROR',
    errorMessage: 'Payment cancelled by user',
  };
  assert(PaymentFailureSchema.safeParse(validFailureInput).success, 'PaymentFailureSchema parses valid failure input');

  // 3. WebhookRepository Unit Tests
  console.log('\n3. Testing WebhookRepository:');
  const testEventId = `evt_test_${Date.now()}`;
  const webhookRecord = await WebhookRepository.create({
    provider: 'RAZORPAY',
    eventId: testEventId,
    eventType: 'payment.captured',
    payload: { id: testEventId, event: 'payment.captured' },
    processed: false,
  });
  assert(webhookRecord.eventId === testEventId, 'WebhookRepository.create stores eventId correctly');
  assert(webhookRecord.processed === false, 'WebhookRepository.create sets processed to false');

  const foundWebhook = await WebhookRepository.findByEventId(testEventId);
  assert(foundWebhook?.id === webhookRecord.id, 'WebhookRepository.findByEventId retrieves created event');

  const processedWebhook = await WebhookRepository.markProcessed(webhookRecord.id, true);
  assert(processedWebhook.processed === true, 'WebhookRepository.markProcessed updates processed flag to true');

  // Cleanup webhook record
  await prisma.webhookEvent.delete({ where: { id: webhookRecord.id } });

  // 4. PaymentRepository Unit Tests
  console.log('\n4. Testing PaymentRepository:');

  // 4a. XOR Integrity Rejection (both bookingId and eventBookingId set)
  let rejectedDualBooking = false;
  try {
    await prisma.payment.create({
      data: {
        amount: new Prisma.Decimal('100.00'),
        currency: 'USD',
        status: PaymentStatus.PENDING,
        provider: 'RAZORPAY',
        booking: { connect: { id: testBooking.id } },
        eventBooking: { connect: { id: testEventBooking.id } },
      },
    });
  } catch {
    rejectedDualBooking = true;
  }
  assert(rejectedDualBooking, 'Database constraint rejects payment with both bookingId and eventBookingId populated');

  // 4b. XOR Integrity Rejection (neither bookingId nor eventBookingId set)
  let rejectedNoBooking = false;
  try {
    await prisma.payment.create({
      data: {
        amount: new Prisma.Decimal('100.00'),
        currency: 'USD',
        status: PaymentStatus.PENDING,
        provider: 'RAZORPAY',
      },
    });
  } catch {
    rejectedNoBooking = true;
  }
  assert(rejectedNoBooking, 'Database constraint rejects payment with neither bookingId nor eventBookingId populated');

  // 4c. PaymentRepository.create (linked to Booking)
  const testOrderId = `order_test_${Date.now()}`;
  const testIdempKey = `idemp_repo_${Date.now()}`;
  const paymentRecord = await PaymentRepository.create({
    amount: new Prisma.Decimal('150.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: testOrderId,
    idempotencyKey: testIdempKey,
    booking: { connect: { id: testBooking.id } },
  });
  assert(paymentRecord.id !== undefined, 'PaymentRepository.create creates payment successfully');
  assert(paymentRecord.bookingId === testBooking.id, 'Payment is correctly connected to Booking');
  assert(paymentRecord.eventBookingId === null, 'Payment eventBookingId is null (XOR satisfied)');

  // 4d. Repository find methods
  const foundById = await PaymentRepository.findById(paymentRecord.id);
  assert(foundById?.id === paymentRecord.id, 'PaymentRepository.findById finds payment');

  const foundByOrderId = await PaymentRepository.findByProviderOrderId(testOrderId);
  assert(foundByOrderId?.id === paymentRecord.id, 'PaymentRepository.findByProviderOrderId finds payment');

  const foundByIdemp = await PaymentRepository.findByIdempotencyKey(testIdempKey);
  assert(foundByIdemp?.id === paymentRecord.id, 'PaymentRepository.findByIdempotencyKey finds payment');

  const bookingPayments = await PaymentRepository.findManyByBookingId(testBooking.id);
  assert(bookingPayments.some((p) => p.id === paymentRecord.id), 'PaymentRepository.findManyByBookingId lists payment');

  // 4e. PaymentRepository.update
  const updated = await PaymentRepository.update(paymentRecord.id, {
    paymentMethod: 'UPI',
  });
  assert(updated.paymentMethod === 'UPI', 'PaymentRepository.update modifies fields correctly');

  // 4f. PaymentRepository.markPaymentPaidWithTransaction
  // Ensure booking is PENDING to test transition to CONFIRMED
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.PENDING },
  });

  const testPayId = `pay_mock_${Date.now()}`;
  const testSig = 'mock_valid_signature_12345';
  const paidResult = await PaymentRepository.markPaymentPaidWithTransaction({
    paymentId: paymentRecord.id,
    providerPaymentId: testPayId,
    providerSignature: testSig,
    paymentMethod: 'CARD',
    notes: 'Test payment confirmation',
  });

  assert(paidResult.status === PaymentStatus.PAID, 'markPaymentPaidWithTransaction marks payment as PAID');
  assert(paidResult.providerPaymentId === testPayId, 'providerPaymentId recorded on payment');
  assert(paidResult.providerSignature === testSig, 'providerSignature recorded on payment');

  const postBooking = await prisma.booking.findUnique({ where: { id: testBooking.id } });
  assert(postBooking?.status === BookingStatus.CONFIRMED, 'Booking transitioned to CONFIRMED automatically in transaction');

  const statusHistories = await prisma.bookingStatusHistory.findMany({
    where: { bookingId: testBooking.id, changedBy: 'PAYMENT_VERIFIED' },
  });
  assert(statusHistories.length > 0, 'BookingStatusHistory recorded with changedBy = PAYMENT_VERIFIED');

  // 4g. Idempotent re-execution of markPaymentPaidWithTransaction
  const rePaidResult = await PaymentRepository.markPaymentPaidWithTransaction({
    paymentId: paymentRecord.id,
    providerPaymentId: testPayId,
    providerSignature: testSig,
  });
  assert(rePaidResult.status === PaymentStatus.PAID, 'markPaymentPaidWithTransaction is idempotent when already PAID');

  // 4h. markPaymentFailed on already PAID payment should not change status
  const failAttemptOnPaid = await PaymentRepository.markPaymentFailed({
    paymentId: paymentRecord.id,
    errorCode: 'TEST_ERROR',
  });
  assert(failAttemptOnPaid.status === PaymentStatus.PAID, 'markPaymentFailed does not downgrade PAID payment to FAILED');

  // 4i. markPaymentFailed on a PENDING payment
  const pendingPaymentForFail = await PaymentRepository.create({
    amount: new Prisma.Decimal('50.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_fail_test_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });

  const failedResult = await PaymentRepository.markPaymentFailed({
    paymentId: pendingPaymentForFail.id,
    errorCode: 'GATEWAY_ERROR',
    errorMessage: 'Card expired',
  });
  assert(failedResult.status === PaymentStatus.FAILED, 'markPaymentFailed sets status to FAILED');
  assert(failedResult.errorCode === 'GATEWAY_ERROR', 'errorCode recorded');
  assert(failedResult.errorMessage === 'Card expired', 'errorMessage recorded');

  // Clean up repo test payments & status histories
  await prisma.payment.deleteMany({ where: { id: { in: [paymentRecord.id, pendingPaymentForFail.id] } } });
  await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: testBooking.id, changedBy: 'PAYMENT_VERIFIED' } });

  // 5. PaymentService Unit & Integration Tests
  console.log('\n5. Testing PaymentService Domain Logic:');

  // 5a. Mock Razorpay SDK orders.create
  const razorpayClient = getRazorpayClient();
  let mockGatewayCallCount = 0;
  let lastGatewayOrderArgs: Record<string, unknown> | null = null;
  (razorpayClient.orders as unknown as { create: (args: Record<string, unknown>) => Promise<unknown> }).create = async (
    args: Record<string, unknown>
  ) => {
    mockGatewayCallCount++;
    lastGatewayOrderArgs = args;
    return {
      id: `order_rzp_mock_${Date.now()}_${mockGatewayCallCount}`,
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

  // Ensure testBooking is PENDING
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.PENDING },
  });

  // Ensure testBooking has no lingering payments
  await prisma.payment.deleteMany({ where: { bookingId: testBooking.id } });

  // 5b. PaymentService.createPaymentOrder for Experience Booking
  mockGatewayCallCount = 0;
  const orderRes1 = await PaymentService.createPaymentOrder(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
    },
    { isStaff: true }
  );

  assert(orderRes1.bookingNumber === testBooking.bookingNumber, 'createPaymentOrder returns correct bookingNumber');
  assert(orderRes1.alreadyCreated === false, 'alreadyCreated is false for new order');
  assert(mockGatewayCallCount === 1, 'Gateway orders.create was invoked once');
  const gatewayArgs = lastGatewayOrderArgs as Record<string, unknown> | null;
  assert(gatewayArgs !== null && gatewayArgs.receipt === testBooking.bookingNumber, 'Receipt passed to gateway matches bookingNumber');
  assert(gatewayArgs !== null && gatewayArgs.currency === 'USD', 'Currency passed to gateway matches USD');
  assert(
    gatewayArgs !== null && gatewayArgs.amount === Math.round(Number(testBooking.totalPrice) * 100),
    'Amount passed to gateway is converted to subunits (cents)'
  );

  // 5c. Active Pending Order Reuse (TTL < 15 min)
  const orderResReuse = await PaymentService.createPaymentOrder(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
    },
    { isStaff: true }
  );
  assert(orderResReuse.alreadyCreated === true, 'createPaymentOrder reuses active pending order');
  assert(orderResReuse.orderId === orderRes1.orderId, 'Reused orderId matches original orderId');
  assert(mockGatewayCallCount === 1, 'Gateway orders.create was NOT called again during reuse');

  // 5d. Idempotency Key Handling
  const uniqueIdempKey = `idemp_srv_${Date.now()}`;
  // Clean up orderRes1 payment to test explicit idempotency key creation
  await prisma.payment.deleteMany({ where: { id: orderRes1.paymentId } });

  const orderResIdemp1 = await PaymentService.createPaymentOrder(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
      idempotencyKey: uniqueIdempKey,
    },
    { isStaff: true }
  );
  assert(orderResIdemp1.alreadyCreated === false, 'Created order with idempotency key');

  const orderResIdemp2 = await PaymentService.createPaymentOrder(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
      idempotencyKey: uniqueIdempKey,
    },
    { isStaff: true }
  );
  assert(orderResIdemp2.alreadyCreated === true, 'Re-submitting same idempotency key returns existing order');
  assert(orderResIdemp2.orderId === orderResIdemp1.orderId, 'Idempotent response has matching orderId');

  // Attempting to use the same idempotency key for a different booking should throw 409
  await prisma.eventBooking.update({
    where: { id: testEventBooking.id },
    data: { status: BookingStatus.PENDING },
  });
  await prisma.payment.deleteMany({ where: { eventBookingId: testEventBooking.id } });

  let idempConflictThrown = false;
  try {
    await PaymentService.createPaymentOrder(
      {
        bookingType: 'EVENT',
        bookingNumber: testEventBooking.bookingNumber,
        idempotencyKey: uniqueIdempKey,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 409) {
      idempConflictThrown = true;
    }
  }
  assert(idempConflictThrown, 'Using same idempotency key for different reservation throws 409 Conflict');

  // 5e. Ownership validation tests
  console.log('\n6. Testing Ownership Validation Boundaries:');

  // Status guard: find a completed booking
  const completedBooking = initialBookings.find((b) => b.status === BookingStatus.COMPLETED);
  if (completedBooking) {
    let completedRejected = false;
    try {
      await PaymentService.createPaymentOrder(
        {
          bookingType: 'EXPERIENCE',
          bookingNumber: completedBooking.bookingNumber,
        },
        { isStaff: true }
      );
    } catch (err: unknown) {
      if (err instanceof PaymentError && err.statusCode === 400 && err.message.includes('completed reservation')) {
        completedRejected = true;
      }
    }
    assert(completedRejected, 'Creating order for completed booking throws 400 Bad Request');
  }

  // Target booking with guest profile to verify ownership checks
  const bookingWithGuest = initialBookings.find((b) => b.guestProfileId !== null) || testBooking;
  if (bookingWithGuest.guestProfileId) {
    // Matching guestProfileId should succeed
    const guestPayments = await PaymentService.getPaymentsForBooking(
      'EXPERIENCE',
      bookingWithGuest.bookingNumber,
      { guestProfileId: bookingWithGuest.guestProfileId }
    );
    assert(Array.isArray(guestPayments), 'Matching guestProfileId is authorized to view payments');

    // Staff should succeed
    const staffPayments = await PaymentService.getPaymentsForBooking(
      'EXPERIENCE',
      bookingWithGuest.bookingNumber,
      { isStaff: true }
    );
    assert(Array.isArray(staffPayments), 'Staff (isStaff: true) is authorized to view payments');

    // Mismatched guest should throw 403
    let mismatchedGuestForbidden = false;
    try {
      await PaymentService.getPaymentsForBooking(
        'EXPERIENCE',
        bookingWithGuest.bookingNumber,
        { guestProfileId: 'completely_different_guest_id' }
      );
    } catch (err: unknown) {
      if (err instanceof PaymentError && err.statusCode === 403) {
        mismatchedGuestForbidden = true;
      }
    }
    assert(mismatchedGuestForbidden, 'Mismatched guestProfileId throws 403 Forbidden');
  }

  // 5f. Cryptographic Signature Verification & verifyPayment
  console.log('\n7. Testing verifyPayment with Cryptographic Verification:');

  const currentPayment = await prisma.payment.findUnique({
    where: { id: orderResIdemp1.paymentId },
  });
  assert(currentPayment !== null, 'Found current test pending payment');

  const providerOrderId = currentPayment!.providerOrderId!;
  const providerPaymentId = `pay_rzp_mock_${Date.now()}`;

  // Generate an invalid signature
  let invalidSigRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: testBooking.bookingNumber,
        razorpayOrderId: providerOrderId,
        razorpayPaymentId: providerPaymentId,
        razorpaySignature: 'invalid_tampered_signature_hex_code',
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 400 && err.message.includes('Invalid payment signature')) {
      invalidSigRejected = true;
    }
  }
  assert(invalidSigRejected, 'Tampered/invalid signature rejected with 400 Bad Request');

  // Generate genuine HMAC-SHA256 signature
  const validHmacSignature = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest('hex');

  // Execute verifyPayment with valid signature
  const verifyResult = await PaymentService.verifyPayment(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: providerPaymentId,
      razorpaySignature: validHmacSignature,
    },
    { isStaff: true }
  );

  assert(verifyResult.success === true, 'verifyPayment succeeds with valid signature');
  assert(verifyResult.alreadyProcessed === false, 'alreadyProcessed is false on first verification');
  assert(verifyResult.status === PaymentStatus.PAID, 'Returned payment status is PAID');

  // Verify DB state post-verification
  const verifiedPaymentInDb = await prisma.payment.findUnique({ where: { id: orderResIdemp1.paymentId } });
  assert(verifiedPaymentInDb?.status === PaymentStatus.PAID, 'Payment record in DB is now PAID');
  assert(verifiedPaymentInDb?.providerPaymentId === providerPaymentId, 'Payment providerPaymentId recorded');

  const verifiedBookingInDb = await prisma.booking.findUnique({ where: { id: testBooking.id } });
  assert(verifiedBookingInDb?.status === BookingStatus.CONFIRMED, 'Booking transitioned to CONFIRMED');

  // 5g. Idempotent re-verify
  const reVerifyResult = await PaymentService.verifyPayment(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
      razorpayOrderId: providerOrderId,
      razorpayPaymentId: providerPaymentId,
      razorpaySignature: validHmacSignature,
    },
    { isStaff: true }
  );
  assert(reVerifyResult.success === true, 'Re-verifying returns success');
  assert(reVerifyResult.alreadyProcessed === true, 'Re-verifying returns alreadyProcessed: true');

  // 7b. Strict Reservation Lifecycle Verification Guards
  console.log('\n7b. Testing Strict Reservation Lifecycle Verification Guards:');

  // Guard: FAILED payment can be promoted to PAID if reservation is PENDING
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.PENDING },
  });
  const failedPromoPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('100.00'),
    currency: 'USD',
    status: PaymentStatus.FAILED,
    provider: 'RAZORPAY',
    providerOrderId: `order_failed_promo_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });
  const promoPayId = `pay_promo_${Date.now()}`;
  const promoSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${failedPromoPayment.providerOrderId}|${promoPayId}`)
    .digest('hex');

  const promoResult = await PaymentService.verifyPayment(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
      razorpayOrderId: failedPromoPayment.providerOrderId!,
      razorpayPaymentId: promoPayId,
      razorpaySignature: promoSig,
    },
    { isStaff: true }
  );
  assert(promoResult.status === PaymentStatus.PAID, 'FAILED payment can be verified and promoted to PAID when reservation is PENDING');
  await prisma.payment.deleteMany({ where: { id: failedPromoPayment.id } });

  // Now ensure testBooking is CONFIRMED
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.CONFIRMED },
  });

  const baseHistoryCount = await prisma.bookingStatusHistory.count({
    where: { bookingId: testBooking.id },
  });

  // Guard 1: Different PENDING payment against already-CONFIRMED reservation throws 409
  const secondPendingPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('100.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_second_pending_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });
  const secondPayId = `pay_second_${Date.now()}`;
  const secondSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${secondPendingPayment.providerOrderId}|${secondPayId}`)
    .digest('hex');

  let confirmedRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: testBooking.bookingNumber,
        razorpayOrderId: secondPendingPayment.providerOrderId!,
        razorpayPaymentId: secondPayId,
        razorpaySignature: secondSig,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 409 && err.message.includes('already confirmed')) {
      confirmedRejected = true;
    }
  }
  assert(confirmedRejected, 'Different payment verification against already-CONFIRMED reservation throws 409 Conflict');
  const postSecondPayment = await prisma.payment.findUnique({ where: { id: secondPendingPayment.id } });
  assert(postSecondPayment?.status === PaymentStatus.PENDING, 'Rejected payment against CONFIRMED reservation remains PENDING');
  const postConfirmedBooking = await prisma.booking.findUnique({ where: { id: testBooking.id } });
  assert(postConfirmedBooking?.status === BookingStatus.CONFIRMED, 'Booking remains CONFIRMED without change');
  const historyAfterConfirmed = await prisma.bookingStatusHistory.count({ where: { bookingId: testBooking.id } });
  assert(historyAfterConfirmed === baseHistoryCount, 'No status history created for rejected payment on CONFIRMED booking');
  await prisma.payment.deleteMany({ where: { id: secondPendingPayment.id } });

  // Guard 2: CANCELLED reservation verification rejection
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.CANCELLED },
  });
  const cancelTestPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('100.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_cancel_test_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });
  const cancelPayId = `pay_cancel_${Date.now()}`;
  const cancelSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${cancelTestPayment.providerOrderId}|${cancelPayId}`)
    .digest('hex');

  let cancelledRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: testBooking.bookingNumber,
        razorpayOrderId: cancelTestPayment.providerOrderId!,
        razorpayPaymentId: cancelPayId,
        razorpaySignature: cancelSig,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 400 && err.message.includes('cancelled reservation')) {
      cancelledRejected = true;
    }
  }
  assert(cancelledRejected, 'Payment verification against CANCELLED reservation throws 400 Bad Request');
  const postCancelPayment = await prisma.payment.findUnique({ where: { id: cancelTestPayment.id } });
  assert(postCancelPayment?.status === PaymentStatus.PENDING, 'Payment remains PENDING after rejected attempt on CANCELLED booking');
  const postCancelledBooking = await prisma.booking.findUnique({ where: { id: testBooking.id } });
  assert(postCancelledBooking?.status === BookingStatus.CANCELLED, 'Booking remains CANCELLED without change');
  await prisma.payment.deleteMany({ where: { id: cancelTestPayment.id } });

  // Guard 3: COMPLETED reservation verification rejection
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.COMPLETED },
  });
  const completeTestPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('100.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_complete_test_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });
  const completePayId = `pay_complete_${Date.now()}`;
  const completeSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${completeTestPayment.providerOrderId}|${completePayId}`)
    .digest('hex');

  let completedRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: testBooking.bookingNumber,
        razorpayOrderId: completeTestPayment.providerOrderId!,
        razorpayPaymentId: completePayId,
        razorpaySignature: completeSig,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 400 && err.message.includes('completed reservation')) {
      completedRejected = true;
    }
  }
  assert(completedRejected, 'Payment verification against COMPLETED reservation throws 400 Bad Request');
  const postCompletePayment = await prisma.payment.findUnique({ where: { id: completeTestPayment.id } });
  assert(postCompletePayment?.status === PaymentStatus.PENDING, 'Payment remains PENDING after rejected attempt on COMPLETED booking');
  const postCompletedBooking = await prisma.booking.findUnique({ where: { id: testBooking.id } });
  assert(postCompletedBooking?.status === BookingStatus.COMPLETED, 'Booking remains COMPLETED without change');
  await prisma.payment.deleteMany({ where: { id: completeTestPayment.id } });

  // Guard 4: CHECKED_IN reservation verification rejection
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.CHECKED_IN },
  });
  const checkinTestPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('100.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_checkin_test_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });
  const checkinPayId = `pay_checkin_${Date.now()}`;
  const checkinSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${checkinTestPayment.providerOrderId}|${checkinPayId}`)
    .digest('hex');

  let checkinRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: testBooking.bookingNumber,
        razorpayOrderId: checkinTestPayment.providerOrderId!,
        razorpayPaymentId: checkinPayId,
        razorpaySignature: checkinSig,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 400 && err.message.includes('checked-in reservation')) {
      checkinRejected = true;
    }
  }
  assert(checkinRejected, 'Payment verification against CHECKED_IN reservation throws 400 Bad Request');
  const postCheckinPayment = await prisma.payment.findUnique({ where: { id: checkinTestPayment.id } });
  assert(postCheckinPayment?.status === PaymentStatus.PENDING, 'Payment remains PENDING after rejected attempt on CHECKED_IN booking');
  const postCheckinBooking = await prisma.booking.findUnique({ where: { id: testBooking.id } });
  assert(postCheckinBooking?.status === BookingStatus.CHECKED_IN, 'Booking remains CHECKED_IN without change');
  await prisma.payment.deleteMany({ where: { id: checkinTestPayment.id } });

  // Guard 5: NO_SHOW reservation verification rejection
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.NO_SHOW },
  });
  const noshowTestPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('100.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_noshow_test_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });
  const noshowPayId = `pay_noshow_${Date.now()}`;
  const noshowSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${noshowTestPayment.providerOrderId}|${noshowPayId}`)
    .digest('hex');

  let noshowRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: testBooking.bookingNumber,
        razorpayOrderId: noshowTestPayment.providerOrderId!,
        razorpayPaymentId: noshowPayId,
        razorpaySignature: noshowSig,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 400 && err.message.includes('no-show reservation')) {
      noshowRejected = true;
    }
  }
  assert(noshowRejected, 'Payment verification against NO_SHOW reservation throws 400 Bad Request');
  const postNoshowPayment = await prisma.payment.findUnique({ where: { id: noshowTestPayment.id } });
  assert(postNoshowPayment?.status === PaymentStatus.PENDING, 'Payment remains PENDING after rejected attempt on NO_SHOW booking');
  const postNoshowBooking = await prisma.booking.findUnique({ where: { id: testBooking.id } });
  assert(postNoshowBooking?.status === BookingStatus.NO_SHOW, 'Booking remains NO_SHOW without change');
  await prisma.payment.deleteMany({ where: { id: noshowTestPayment.id } });

  // Restore testBooking to CONFIRMED
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.CONFIRMED },
  });

  // 5h. Creating order for already paid reservation throws 409
  let alreadyPaidOrderRejected = false;
  try {
    await PaymentService.createPaymentOrder(
      {
        bookingType: 'EXPERIENCE',
        bookingNumber: testBooking.bookingNumber,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 409) {
      alreadyPaidOrderRejected = true;
    }
  }
  assert(alreadyPaidOrderRejected, 'Creating order for already paid booking throws 409 Conflict');

  // 5i. recordPaymentFailure
  console.log('\n8. Testing recordPaymentFailure:');
  const failureTestPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('75.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_to_fail_${Date.now()}`,
    booking: { connect: { id: testBooking.id } },
  });

  const failureResult = await PaymentService.recordPaymentFailure(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: testBooking.bookingNumber,
      providerOrderId: failureTestPayment.providerOrderId!,
      errorCode: 'PAYMENT_CANCELLED',
      errorMessage: 'User dismissed checkout modal',
      metadata: { reason: 'user_cancel' },
    },
    { isStaff: true }
  );

  assert(failureResult.status === PaymentStatus.FAILED, 'recordPaymentFailure transitions payment to FAILED');
  assert(failureResult.errorCode === 'PAYMENT_CANCELLED', 'Failure errorCode stored');
  assert(failureResult.errorMessage === 'User dismissed checkout modal', 'Failure errorMessage stored');

  // 5j. getPaymentsForBooking
  console.log('\n9. Testing getPaymentsForBooking:');
  const historyPayments = await PaymentService.getPaymentsForBooking(
    'EXPERIENCE',
    testBooking.bookingNumber,
    { isStaff: true }
  );
  assert(historyPayments.length >= 2, `getPaymentsForBooking returned payment history (count: ${historyPayments.length})`);

  // 6. Event Booking Flow Verification
  console.log('\n10. Testing Event Booking Payment Flow:');
  // Ensure event booking is PENDING
  await prisma.eventBooking.update({
    where: { id: testEventBooking.id },
    data: { status: BookingStatus.PENDING },
  });

  const eventOrderRes = await PaymentService.createPaymentOrder(
    {
      bookingType: 'EVENT',
      bookingNumber: testEventBooking.bookingNumber,
    },
    { isStaff: true }
  );
  assert(eventOrderRes.bookingType === 'EVENT', 'Event booking order created with bookingType EVENT');
  assert(eventOrderRes.orderId !== undefined, 'Event order ID generated');

  const eventPayment = await prisma.payment.findUnique({
    where: { id: eventOrderRes.paymentId },
  });
  assert(eventPayment?.eventBookingId === testEventBooking.id, 'Payment record correctly connected to eventBookingId');
  assert(eventPayment?.bookingId === null, 'Payment record bookingId is null for event');

  const eventPaymentId = `pay_event_mock_${Date.now()}`;
  const validEventHmacSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${eventOrderRes.orderId}|${eventPaymentId}`)
    .digest('hex');

  const eventVerifyResult = await PaymentService.verifyPayment(
    {
      bookingType: 'EVENT',
      bookingNumber: testEventBooking.bookingNumber,
      razorpayOrderId: eventOrderRes.orderId,
      razorpayPaymentId: eventPaymentId,
      razorpaySignature: validEventHmacSig,
    },
    { isStaff: true }
  );
  assert(eventVerifyResult.success === true, 'Event payment verified successfully');
  assert(eventVerifyResult.status === PaymentStatus.PAID, 'Event payment marked PAID');

  const postEventBooking = await prisma.eventBooking.findUnique({ where: { id: testEventBooking.id } });
  assert(postEventBooking?.status === BookingStatus.CONFIRMED, 'EventBooking transitioned to CONFIRMED');

  const eventHistories = await prisma.eventBookingStatusHistory.findMany({
    where: { eventBookingId: testEventBooking.id, changedBy: 'PAYMENT_VERIFIED' },
  });
  assert(eventHistories.length > 0, 'EventBookingStatusHistory recorded with changedBy = PAYMENT_VERIFIED');

  // Event Guard 1: Second PENDING payment against already-CONFIRMED event booking throws 409
  const secondEventPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('50.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_second_evt_${Date.now()}`,
    eventBooking: { connect: { id: testEventBooking.id } },
  });
  const secondEvtPayId = `pay_sec_evt_${Date.now()}`;
  const secondEvtSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${secondEventPayment.providerOrderId}|${secondEvtPayId}`)
    .digest('hex');

  let eventConfirmedRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EVENT',
        bookingNumber: testEventBooking.bookingNumber,
        razorpayOrderId: secondEventPayment.providerOrderId!,
        razorpayPaymentId: secondEvtPayId,
        razorpaySignature: secondEvtSig,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 409 && err.message.includes('already confirmed')) {
      eventConfirmedRejected = true;
    }
  }
  assert(eventConfirmedRejected, 'Different payment verification against already-CONFIRMED event booking throws 409 Conflict');
  const postSecondEvtPayment = await prisma.payment.findUnique({ where: { id: secondEventPayment.id } });
  assert(postSecondEvtPayment?.status === PaymentStatus.PENDING, 'Rejected payment against CONFIRMED event booking remains PENDING');
  await prisma.payment.deleteMany({ where: { id: secondEventPayment.id } });

  // Event Guard 2: Payment verification against CANCELLED event booking throws 400
  await prisma.eventBooking.update({
    where: { id: testEventBooking.id },
    data: { status: BookingStatus.CANCELLED },
  });
  const cancelEvtPayment = await PaymentRepository.create({
    amount: new Prisma.Decimal('50.00'),
    currency: 'USD',
    status: PaymentStatus.PENDING,
    provider: 'RAZORPAY',
    providerOrderId: `order_cancel_evt_${Date.now()}`,
    eventBooking: { connect: { id: testEventBooking.id } },
  });
  const cancelEvtPayId = `pay_can_evt_${Date.now()}`;
  const cancelEvtSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${cancelEvtPayment.providerOrderId}|${cancelEvtPayId}`)
    .digest('hex');

  let eventCancelledRejected = false;
  try {
    await PaymentService.verifyPayment(
      {
        bookingType: 'EVENT',
        bookingNumber: testEventBooking.bookingNumber,
        razorpayOrderId: cancelEvtPayment.providerOrderId!,
        razorpayPaymentId: cancelEvtPayId,
        razorpaySignature: cancelEvtSig,
      },
      { isStaff: true }
    );
  } catch (err: unknown) {
    if (err instanceof PaymentError && err.statusCode === 400 && err.message.includes('cancelled reservation')) {
      eventCancelledRejected = true;
    }
  }
  assert(eventCancelledRejected, 'Payment verification against CANCELLED event booking throws 400 Bad Request');
  const postCancelEvtPayment = await prisma.payment.findUnique({ where: { id: cancelEvtPayment.id } });
  assert(postCancelEvtPayment?.status === PaymentStatus.PENDING, 'Rejected payment against CANCELLED event booking remains PENDING');
  await prisma.payment.deleteMany({ where: { id: cancelEvtPayment.id } });

  // 7. Complete Teardown & Database State Restoration
  console.log('\n11. Restoring Database State and Performing Final Integrity Audit:');

  // Clean up all created payments
  await prisma.payment.deleteMany({});
  // Clean up all created webhook events
  await prisma.webhookEvent.deleteMany({});
  // Clean up test status history records
  await prisma.bookingStatusHistory.deleteMany({
    where: { bookingId: testBooking.id, changedBy: 'PAYMENT_VERIFIED' },
  });
  await prisma.eventBookingStatusHistory.deleteMany({
    where: { eventBookingId: testEventBooking.id, changedBy: 'PAYMENT_VERIFIED' },
  });

  // Restore original booking statuses
  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: initialTestBookingStatus },
  });
  await prisma.eventBooking.update({
    where: { id: testEventBooking.id },
    data: { status: initialTestEventBookingStatus },
  });

  // Final check
  const finalBookingsCount = await prisma.booking.count();
  const finalEventBookingsCount = await prisma.eventBooking.count();
  const finalPaymentCount = await prisma.payment.count();
  const finalWebhookCount = await prisma.webhookEvent.count();

  assert(finalBookingsCount === 17, `Final Bookings count is exactly 17 (found: ${finalBookingsCount})`);
  assert(finalEventBookingsCount === 5, `Final EventBookings count is exactly 5 (found: ${finalEventBookingsCount})`);
  assert(finalPaymentCount === 0, `Final Payments count is exactly 0 (found: ${finalPaymentCount})`);
  assert(finalWebhookCount === 0, `Final WebhookEvents count is exactly 0 (found: ${finalWebhookCount})`);

  console.log('\n==================================================');
  console.log(`Phase 7.0B Test Results: ${passed} passed, ${failed} failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test execution failed with unhandled exception:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

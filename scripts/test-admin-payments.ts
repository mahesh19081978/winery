/**
 * Phase 7.0G — Admin Payment Management automated test suite.
 *
 * Usage:
 *   npx tsx scripts/test-admin-payments.ts
 *   (optional) TEST_BASE_URL is not required — routes are invoked in-process.
 *
 * Covers:
 *   1. Staff-only authorization on GET /api/admin/payments and /api/admin/payments/[id]
 *   2. List shape + search / status / bookingType / date filters + pagination
 *   3. Detail shape for Experience and Event payments
 *   4. Winery (tenant) isolation on list and detail
 *   5. Sensitive-data protection (providerSignature, idempotencyKey, metadata)
 *   6. Refund authorization through the existing POST /api/payments/refund API
 *   7. Strict database cleanup with baseline re-assertion
 */
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';
import { BookingService, EventBookingService } from '../src/server/services';
import { POST as createOrderRoute } from '../src/app/api/payments/create-order/route';
import { POST as verifyRoute } from '../src/app/api/payments/verify/route';
import { POST as refundRoute } from '../src/app/api/payments/refund/route';
import { GET as adminListRoute } from '../src/app/api/admin/payments/route';
import { GET as adminDetailRoute } from '../src/app/api/admin/payments/[id]/route';
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client';
import { getRazorpayClient } from '../src/lib/razorpay';
import { AuthService, ADMIN_AUTH_COOKIE_NAME } from '../src/lib/auth';
import crypto from 'crypto';

// Mock Razorpay gateway credentials for this run
const TEST_KEY_ID = 'rzp_test_mock_admin_key';
const TEST_KEY_SECRET = 'mock_secret_admin_1234567890abcdef';
const TEST_WEBHOOK_SECRET = 'mock_webhook_secret_admin_xyz987654321';
process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

const RUN = Date.now().toString(36).toUpperCase();

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

async function parseResponse(res: Response) {
  const status = res.status;
  const json = await res.json();
  return { status, json };
}

async function callList(query: Record<string, string>, cookie?: string) {
  const qs = new URLSearchParams(query).toString();
  const res = await adminListRoute(buildGetRequest(`/api/admin/payments${qs ? `?${qs}` : ''}`, cookie));
  return parseResponse(res);
}

async function callDetail(id: string, cookie?: string) {
  const res = await adminDetailRoute(buildGetRequest(`/api/admin/payments/${encodeURIComponent(id)}`, cookie), {
    params: Promise.resolve({ id }),
  });
  return parseResponse(res);
}

async function callRefund(body: Record<string, unknown>, cookie?: string) {
  const res = await refundRoute(buildPostRequest('/api/payments/refund', body, cookie));
  return parseResponse(res);
}

async function runTests() {
  console.log('=== Phase 7.0G — Admin Payment Management Test Suite ===\n');

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

  // ---------------------------------------------------------------- 1. Baseline
  console.log('1. Auditing Initial Database State:');
  const initialBookings = await prisma.booking.count();
  const initialEventBookings = await prisma.eventBooking.count();
  const initialPayments = await prisma.payment.count();
  const initialWineries = await prisma.winery.count();
  const initialGuestProfiles = await prisma.guestProfile.count();

  console.log(
    `   bookings=${initialBookings} eventBookings=${initialEventBookings} ` +
      `payments=${initialPayments} wineries=${initialWineries} guestProfiles=${initialGuestProfiles}`
  );
  assert(initialPayments === 0, `Initial Payments count is 0 (found: ${initialPayments})`);

  // ------------------------------------------------------------ 2. Gateway mocks
  const razorpayClient = getRazorpayClient();
  let mockOrderCounter = 0;
  let mockRefundCounter = 0;
  let gatewayRefundCalls = 0;

  (razorpayClient.orders as unknown as { create: (args: Record<string, unknown>) => Promise<unknown> }).create =
    async (args: Record<string, unknown>) => {
      mockOrderCounter++;
      return {
        id: `order_mock_admin_${Date.now()}_${mockOrderCounter}`,
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
    gatewayRefundCalls++;
    mockRefundCounter++;
    return {
      id: `rfnd_mock_admin_${Date.now()}_${mockRefundCounter}`,
      entity: 'refund',
      amount: args.amount,
      currency: 'USD',
      payment_id: paymentId,
      notes: args.notes,
      receipt: args.receipt,
      created_at: Math.floor(Date.now() / 1000),
      status: 'processed',
    };
  };

  // --------------------------------------------------- 3. Sessions + test tenant
  const defaultWinery = await prisma.winery.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });

  const foreignWinery = await prisma.winery.create({
    data: {
      name: 'Tenant Isolation Test Winery',
      slug: `tenant-iso-${RUN}`,
      description: 'Temporary winery used to prove admin payment tenant isolation.',
      address: '1 Test Lane',
      city: 'Testville',
      state: 'TS',
      country: 'USA',
      postalCode: '00000',
      phone: '+10000000000',
      email: 'tenant-iso@test.local',
      currency: 'USD',
    },
  });

  async function makeStaffCookie(wineryId: string | null, userId: string, email: string) {
    const token = await AuthService.createSessionToken({
      userId,
      email,
      role: UserRole.MANAGER,
      wineryId,
    });
    return `${ADMIN_AUTH_COOKIE_NAME}=${token}`;
  }

  const defaultStaffCookie = await makeStaffCookie(defaultWinery.id, 'staff_admin_pay', 'manager@vinora.com');
  const foreignStaffCookie = await makeStaffCookie(foreignWinery.id, 'staff_admin_pay_foreign', 'foreign@vinora.com');
  const platformStaffCookie = await makeStaffCookie(null, 'staff_admin_pay_platform', 'platform@vinora.com');

  const nonStaffToken = await AuthService.createSessionToken({
    userId: 'guest_user_admin_pay',
    email: 'guest@vinora.com',
    role: UserRole.GUEST,
    wineryId: defaultWinery.id,
  });
  const nonStaffCookie = `${ADMIN_AUTH_COOKIE_NAME}=${nonStaffToken}`;

  // ------------------------------------------------------------ 4. Auth guards
  console.log('\n2. Staff-Only Authorization on Admin Payment Endpoints:');

  const unauthList = await callList({});
  assert(unauthList.status === 401, 'GET /api/admin/payments without session returns HTTP 401');

  const nonStaffList = await callList({}, nonStaffCookie);
  assert(nonStaffList.status === 403, 'GET /api/admin/payments with GUEST role returns HTTP 403');

  const unauthDetail = await callDetail('any-id');
  assert(unauthDetail.status === 401, 'GET /api/admin/payments/[id] without session returns HTTP 401');

  const nonStaffDetail = await callDetail('any-id', nonStaffCookie);
  assert(nonStaffDetail.status === 403, 'GET /api/admin/payments/[id] with GUEST role returns HTTP 403');

  const baselineDefaultList = await callList({ pageSize: '50' }, defaultStaffCookie);
  assert(baselineDefaultList.status === 200, 'GET /api/admin/payments with staff session returns HTTP 200');
  const baselineDefaultTotal: number = baselineDefaultList.json?.data?.pagination?.total ?? -1;

  const baselinePlatformList = await callList({ pageSize: '50' }, platformStaffCookie);
  const baselinePlatformTotal: number = baselinePlatformList.json?.data?.pagination?.total ?? -1;

  const baselineForeignList = await callList({ pageSize: '50' }, foreignStaffCookie);
  const baselineForeignTotal: number = baselineForeignList.json?.data?.pagination?.total ?? -1;

  assert(baselineForeignTotal === 0, `New tenant starts with 0 payments (found: ${baselineForeignTotal})`);

  // -------------------------------------------------------------- 5. Test data
  console.log('\n3. Creating Experience, Event and Cross-Tenant Payment Records:');

  const experience = await prisma.experience.findFirstOrThrow({
    where: { wineryId: defaultWinery.id, isActive: true },
  });
  const event = await prisma.event.findFirstOrThrow({
    where: { wineryId: defaultWinery.id, status: 'UPCOMING', isPast: false },
    include: { ticketTypes: true, schedules: true },
    orderBy: { createdAt: 'asc' },
  });
  const schedule = event.schedules[0];
  const ticketType =
    event.ticketTypes.find((t) => t.capacity - t.soldCount >= 4) ?? event.ticketTypes[0];
  const originalSoldCount = ticketType.soldCount;

  const createdBookingIds: string[] = [];
  const createdEventBookingIds: string[] = [];
  const createdGuestProfileIds: string[] = [];
  const testRecipientEmails = [`adminpay.exp_${RUN}@test.com`, `adminpay.evt_${RUN}@test.com`];

  async function payBooking(bookingType: 'EXPERIENCE' | 'EVENT', bookingNumber: string, tag: string) {
    const orderRes = await createOrderRoute(
      buildPostRequest('/api/payments/create-order', { bookingType, bookingNumber })
    );
    const orderJson = await orderRes.json();
    if (orderRes.status !== 200) throw new Error(`create-order failed: ${orderJson.error}`);
    const providerPaymentId = `pay_admin_${tag}_${Date.now()}`;
    const signature = generatePaymentSignature(orderJson.data.orderId, providerPaymentId);

    const verifyRes = await verifyRoute(
      buildPostRequest('/api/payments/verify', {
        bookingType,
        bookingNumber,
        razorpayOrderId: orderJson.data.orderId,
        razorpayPaymentId: providerPaymentId,
        razorpaySignature: signature,
      })
    );
    const verifyJson = await verifyRes.json();
    if (verifyRes.status !== 200) throw new Error(`verify failed: ${verifyJson.error}`);
    return { providerPaymentId, providerOrderId: orderJson.data.orderId as string };
  }

  const expBooking = await BookingService.createBooking({
    experienceSlug: experience.slug,
    date: '2026-11-24',
    time: '14:00',
    adults: 2,
    children: 0,
    guestName: 'Admin Payments Guest',
    guestEmail: testRecipientEmails[0],
    guestPhone: '+15550101010',
    paymentMethod: 'ONLINE',
  });
  createdBookingIds.push(expBooking.id);
  createdGuestProfileIds.push(expBooking.guestProfileId);
  const expRefs = await payBooking('EXPERIENCE', expBooking.bookingNumber, 'exp');
  const expPayment = await prisma.payment.findUniqueOrThrow({
    where: { providerOrderId: expRefs.providerOrderId },
  });

  const evtBooking = await EventBookingService.createBooking({
    eventId: event.id,
    eventScheduleId: schedule.id,
    guestName: 'Admin Payments Event Guest',
    guestEmail: testRecipientEmails[1],
    guestPhone: '+15550101011',
    tickets: [{ eventTicketTypeId: ticketType.id, quantity: 2 }],
    paymentMethod: 'ONLINE',
  });
  createdEventBookingIds.push(evtBooking.id);
  createdGuestProfileIds.push(evtBooking.guestProfileId);
  const evtRefs = await payBooking('EVENT', evtBooking.bookingNumber, 'evt');
  const evtPayment = await prisma.payment.findUniqueOrThrow({
    where: { providerOrderId: evtRefs.providerOrderId },
  });

  // Cross-tenant booking + payment (belongs to the foreign winery only)
  const foreignBooking = await prisma.booking.create({
    data: {
      bookingNumber: `DVR-TEN-${RUN}`,
      wineryId: foreignWinery.id,
      guestProfileId: expBooking.guestProfileId,
      date: new Date('2026-12-05'),
      time: '11:00',
      adults: 1,
      children: 0,
      totalGuests: 1,
      subtotal: 120,
      taxAmount: 10,
      totalPrice: 130,
      status: BookingStatus.CONFIRMED,
    },
  });
  createdBookingIds.push(foreignBooking.id);

  const FOREIGN_SIGNATURE = 'sig_do_not_leak_admin_payment';
  const FOREIGN_IDEMPOTENCY = `idem_do_not_leak_${RUN}`;
  const FOREIGN_METADATA_SECRET = 'metadata_do_not_leak_admin_payment';

  const foreignPayment = await prisma.payment.create({
    data: {
      bookingId: foreignBooking.id,
      amount: 130,
      currency: 'USD',
      status: PaymentStatus.PAID,
      provider: 'RAZORPAY',
      providerOrderId: `order_tenant_${RUN}`,
      providerPaymentId: `pay_tenant_${RUN}`,
      providerSignature: FOREIGN_SIGNATURE,
      paymentMethod: 'CARD',
      idempotencyKey: FOREIGN_IDEMPOTENCY,
      metadata: { secret: FOREIGN_METADATA_SECRET },
    },
  });

  assert(expPayment.status === PaymentStatus.PAID, 'Experience payment recorded as PAID');
  assert(evtPayment.status === PaymentStatus.PAID, 'Event payment recorded as PAID');
  assert(foreignPayment.status === PaymentStatus.PAID, 'Cross-tenant payment recorded as PAID');

  // ------------------------------------------------------------- 6. List shape
  console.log('\n4. Admin Payment List Endpoint:');

  const listRes = await callList({ pageSize: '50' }, defaultStaffCookie);
  assert(listRes.status === 200, 'List returns HTTP 200 for staff');
  assert(listRes.json?.success === true, 'List response uses { success, data } envelope');

  const listItems: Record<string, unknown>[] = listRes.json?.data?.payments ?? [];
  const listPagination = listRes.json?.data?.pagination ?? {};
  assert(Array.isArray(listItems), 'List data.payments is an array');
  assert(
    typeof listPagination.page === 'number' &&
      typeof listPagination.pageSize === 'number' &&
      typeof listPagination.total === 'number' &&
      typeof listPagination.totalPages === 'number',
    'List includes a pagination object'
  );
  assert(
    listPagination.total === baselineDefaultTotal + 2,
    `Tenant-scoped list total grew by exactly 2 (baseline ${baselineDefaultTotal} → ${listPagination.total})`
  );

  const expItem = listItems.find((p) => p.id === expPayment.id) as Record<string, unknown> | undefined;
  const evtItem = listItems.find((p) => p.id === evtPayment.id) as Record<string, unknown> | undefined;

  assert(Boolean(expItem), 'Experience payment present in list');
  assert(Boolean(evtItem), 'Event payment present in list');
  assert(expItem?.bookingType === 'EXPERIENCE', 'Experience payment reports bookingType EXPERIENCE');
  assert(evtItem?.bookingType === 'EVENT', 'Event payment reports bookingType EVENT');
  assert(expItem?.bookingNumber === expBooking.bookingNumber, 'Experience payment carries booking reference');
  assert(evtItem?.bookingNumber === evtBooking.bookingNumber, 'Event payment carries booking reference');
  assert(typeof expItem?.amount === 'string' && String(expItem.amount) === Number(expItem.amount).toFixed(2), 'Amount serialised as a 2dp string');
  assert(typeof expItem?.currency === 'string' && String(expItem.currency).length === 3, 'Currency serialised');
  assert(typeof expItem?.status === 'string', 'Status serialised');
  assert(typeof expItem?.providerOrderId === 'string', 'providerOrderId exposed');
  assert(typeof expItem?.providerPaymentId === 'string', 'providerPaymentId exposed');
  assert(typeof expItem?.refundId !== 'undefined', 'refundId key present');
  assert(typeof expItem?.refundAmount !== 'undefined', 'refundAmount key present');
  assert(typeof expItem?.createdAt === 'string', 'createdAt serialised');
  assert(typeof expItem?.guestName === 'string', 'Guest name included for staff display');

  // ----------------------------------------------------------------- 7. Filters
  console.log('\n5. Search, Filters and Pagination:');

  const expOnly = await callList({ bookingType: 'EXPERIENCE', pageSize: '50' }, defaultStaffCookie);
  const expOnlyIds = (expOnly.json?.data?.payments ?? []).map((p: { id: string }) => p.id);
  assert(expOnly.status === 200, 'bookingType=EXPERIENCE returns HTTP 200');
  assert(expOnlyIds.includes(expPayment.id), 'bookingType=EXPERIENCE includes the experience payment');
  assert(!expOnlyIds.includes(evtPayment.id), 'bookingType=EXPERIENCE excludes the event payment');
  assert(
    (expOnly.json?.data?.payments ?? []).every((p: { bookingType: string }) => p.bookingType === 'EXPERIENCE'),
    'Every row in EXPERIENCE filter is an experience payment'
  );

  const evtOnly = await callList({ bookingType: 'EVENT', pageSize: '50' }, defaultStaffCookie);
  const evtOnlyIds = (evtOnly.json?.data?.payments ?? []).map((p: { id: string }) => p.id);
  assert(evtOnly.status === 200, 'bookingType=EVENT returns HTTP 200');
  assert(evtOnlyIds.includes(evtPayment.id), 'bookingType=EVENT includes the event payment');
  assert(!evtOnlyIds.includes(expPayment.id), 'bookingType=EVENT excludes the experience payment');

  const paidOnly = await callList({ status: 'PAID', pageSize: '50' }, defaultStaffCookie);
  assert(paidOnly.status === 200, 'status=PAID returns HTTP 200');
  assert(
    (paidOnly.json?.data?.payments ?? []).every((p: { status: string }) => p.status === 'PAID'),
    'status filter only returns PAID rows'
  );

  const refundedOnly = await callList({ status: 'REFUNDED', pageSize: '50' }, defaultStaffCookie);
  assert(refundedOnly.status === 200, 'status=REFUNDED returns HTTP 200');
  assert(
    !(refundedOnly.json?.data?.payments ?? []).some((p: { id: string }) => p.id === expPayment.id),
    'Experience payment not returned as REFUNDED before refunding'
  );

  const searchByBooking = await callList({ search: evtBooking.bookingNumber }, defaultStaffCookie);
  const searchBookingIds = (searchByBooking.json?.data?.payments ?? []).map((p: { id: string }) => p.id);
  assert(searchByBooking.status === 200, 'search returns HTTP 200');
  assert(
    searchBookingIds.length >= 1 && searchBookingIds.includes(evtPayment.id),
    'search by booking number finds the matching payment'
  );

  const searchByProviderId = await callList({ search: expRefs.providerPaymentId }, defaultStaffCookie);
  const searchProviderIds = (searchByProviderId.json?.data?.payments ?? []).map((p: { id: string }) => p.id);
  assert(
    searchProviderIds.length === 1 && searchProviderIds.includes(expPayment.id),
    'search by providerPaymentId narrows to the single payment'
  );

  const searchByGuest = await callList({ search: 'Admin Payments Guest' }, defaultStaffCookie);
  assert(
    (searchByGuest.json?.data?.payments ?? []).some((p: { id: string }) => p.id === expPayment.id),
    'search by guest name finds the payment'
  );

  const futureDate = await callList({ dateFrom: '2099-01-01' }, defaultStaffCookie);
  assert(futureDate.status === 200, 'dateFrom filter returns HTTP 200');
  assert(
    (futureDate.json?.data?.payments ?? []).length === 0,
    'dateFrom in the future returns no payments'
  );

  const badStatus = await callList({ status: 'NOT_A_STATUS' }, defaultStaffCookie);
  assert(badStatus.status === 400, 'Invalid status filter rejected with HTTP 400');

  const badType = await callList({ bookingType: 'HOTEL' }, defaultStaffCookie);
  assert(badType.status === 400, 'Invalid bookingType filter rejected with HTTP 400');

  const badDate = await callList({ dateFrom: 'not-a-date' }, defaultStaffCookie);
  assert(badDate.status === 400, 'Invalid dateFrom rejected with HTTP 400');

  const pageOne = await callList({ pageSize: '1', page: '1' }, defaultStaffCookie);
  const pageTwo = await callList({ pageSize: '1', page: '2' }, defaultStaffCookie);
  assert(pageOne.status === 200 && pageTwo.status === 200, 'Pagination requests return HTTP 200');
  assert(
    (pageOne.json?.data?.payments ?? []).length === 1 && (pageTwo.json?.data?.payments ?? []).length === 1,
    'pageSize=1 returns exactly one row per page'
  );
  assert(
    pageOne.json?.data?.pagination?.totalPages >= 2,
    'Pagination reports at least 2 pages when pageSize=1'
  );
  const pageOneId = pageOne.json?.data?.payments?.[0]?.id;
  const pageTwoId = pageTwo.json?.data?.payments?.[0]?.id;
  assert(Boolean(pageOneId) && Boolean(pageTwoId) && pageOneId !== pageTwoId, 'Consecutive pages return different rows');

  const oversized = await callList({ pageSize: '999' }, defaultStaffCookie);
  assert(
    oversized.json?.data?.pagination?.pageSize <= 50,
    'pageSize is capped at 50'
  );

  // ----------------------------------------------------------------- 8. Detail
  console.log('\n6. Admin Payment Detail Endpoint:');

  const expDetail = await callDetail(expPayment.id, defaultStaffCookie);
  assert(expDetail.status === 200, 'Detail returns HTTP 200 for tenant-scoped payment');
  const expDetailData = expDetail.json?.data ?? {};
  assert(expDetailData.id === expPayment.id, 'Detail returns the requested payment');
  assert(expDetailData.bookingType === 'EXPERIENCE', 'Experience detail reports bookingType EXPERIENCE');
  assert(expDetailData.bookingNumber === expBooking.bookingNumber, 'Detail carries booking reference');
  assert(typeof expDetailData.amount === 'string', 'Detail carries amount');
  assert(typeof expDetailData.currency === 'string', 'Detail carries currency');
  assert(typeof expDetailData.providerOrderId === 'string', 'Detail carries providerOrderId');
  assert(typeof expDetailData.providerPaymentId === 'string', 'Detail carries providerPaymentId');
  assert(typeof expDetailData.bookingStatus === 'string', 'Detail carries booking status');
  assert(typeof expDetailData.bookingDate === 'string', 'Detail carries booking date');
  assert(typeof expDetailData.createdAt === 'string', 'Detail carries payment createdAt');
  assert(typeof expDetailData.updatedAt === 'string', 'Detail carries payment updatedAt');
  assert(typeof expDetailData.refundId !== 'undefined', 'Detail exposes refundId key');
  assert(typeof expDetailData.refundAmount !== 'undefined', 'Detail exposes refundAmount key');
  assert(typeof expDetailData.refundReason !== 'undefined', 'Detail exposes refundReason key');

  const evtDetail = await callDetail(evtPayment.id, defaultStaffCookie);
  assert(evtDetail.status === 200, 'Detail returns HTTP 200 for event payment');
  assert(evtDetail.json?.data?.bookingType === 'EVENT', 'Event detail reports bookingType EVENT');
  assert(evtDetail.json?.data?.bookingNumber === evtBooking.bookingNumber, 'Event detail carries booking reference');
  assert(evtDetail.json?.data?.referenceTitle === event.title, 'Event detail carries the event title');

  const missingDetail = await callDetail('00000000-0000-0000-0000-000000000000', defaultStaffCookie);
  assert(missingDetail.status === 404, 'Unknown payment id returns HTTP 404');

  // ------------------------------------------------------- 9. Sensitive payloads
  console.log('\n7. Sensitive Data Protection:');

  const rawListBody = JSON.stringify(listRes.json);
  assert(!rawListBody.includes('providerSignature'), 'List payload never contains providerSignature');
  assert(!rawListBody.includes('idempotencyKey'), 'List payload never contains idempotencyKey');
  assert(!rawListBody.includes('metadata'), 'List payload never contains metadata');
  assert(!rawListBody.includes(FOREIGN_SIGNATURE), 'List payload never contains a raw signature value');
  assert(!rawListBody.includes(FOREIGN_IDEMPOTENCY), 'List payload never contains a raw idempotency key');

  const rawDetailBody = JSON.stringify(expDetail.json);
  assert(!rawDetailBody.includes('providerSignature'), 'Detail payload never contains providerSignature');
  assert(!rawDetailBody.includes('idempotencyKey'), 'Detail payload never contains idempotencyKey');
  assert(!rawDetailBody.includes('metadata'), 'Detail payload never contains metadata');

  const foreignDetail = await callDetail(foreignPayment.id, foreignStaffCookie);
  assert(foreignDetail.status === 200, 'Detail returns HTTP 200 for the owning tenant');
  const rawForeignDetail = JSON.stringify(foreignDetail.json);
  assert(!rawForeignDetail.includes(FOREIGN_SIGNATURE), 'Owning tenant never receives providerSignature value');
  assert(!rawForeignDetail.includes(FOREIGN_IDEMPOTENCY), 'Owning tenant never receives idempotencyKey value');
  assert(
    !rawForeignDetail.includes(FOREIGN_METADATA_SECRET),
    'Owning tenant never receives metadata contents'
  );

  // ------------------------------------------------------- 10. Tenant isolation
  console.log('\n8. Winery (Tenant) Isolation:');

  const defaultList = await callList({ pageSize: '50' }, defaultStaffCookie);
  const defaultIds = (defaultList.json?.data?.payments ?? []).map((p: { id: string }) => p.id);
  assert(
    !defaultIds.includes(foreignPayment.id),
    'Default-winery staff list does not include the foreign winery payment'
  );
  assert(
    defaultIds.includes(expPayment.id) && defaultIds.includes(evtPayment.id),
    'Default-winery staff list includes its own payments'
  );

  const foreignList = await callList({ pageSize: '50' }, foreignStaffCookie);
  const foreignIds = (foreignList.json?.data?.payments ?? []).map((p: { id: string }) => p.id);
  assert(foreignList.status === 200, 'Foreign tenant staff can list their own payments');
  assert(foreignIds.includes(foreignPayment.id), 'Foreign tenant list includes its own payment');
  assert(
    !foreignIds.includes(expPayment.id) && !foreignIds.includes(evtPayment.id),
    'Foreign tenant list excludes default-winery payments'
  );

  const platformList = await callList({ pageSize: '50' }, platformStaffCookie);
  const platformIds = (platformList.json?.data?.payments ?? []).map((p: { id: string }) => p.id);
  assert(
    platformList.json?.data?.pagination?.total === baselinePlatformTotal + 3,
    `Unscoped staff list total grew by exactly 3 (baseline ${baselinePlatformTotal} → ${platformList.json?.data?.pagination?.total})`
  );
  assert(
    platformIds.includes(expPayment.id) &&
      platformIds.includes(evtPayment.id) &&
      platformIds.includes(foreignPayment.id),
    'Staff without a winery binding (platform super admin) sees every payment'
  );

  const crossDetailDenied = await callDetail(foreignPayment.id, defaultStaffCookie);
  assert(crossDetailDenied.status === 404, 'Cross-tenant detail access returns HTTP 404');

  const reverseCrossDetailDenied = await callDetail(expPayment.id, foreignStaffCookie);
  assert(reverseCrossDetailDenied.status === 404, 'Reverse cross-tenant detail access returns HTTP 404');

  const crossTenantSearch = await callList({ search: foreignPayment.id }, defaultStaffCookie);
  assert(
    (crossTenantSearch.json?.data?.payments ?? []).length === 0,
    'Cross-tenant payment is not discoverable through list search'
  );

  // ------------------------------------------------------- 11. Refund authz
  console.log('\n9. Refund Authorization (existing POST /api/payments/refund):');

  const refundUnauth = await callRefund({
    bookingType: 'EXPERIENCE',
    bookingNumber: expBooking.bookingNumber,
    paymentId: expPayment.id,
  });
  assert(refundUnauth.status === 403, 'Refund without a staff session returns HTTP 403');

  const refundNonStaff = await callRefund(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: expBooking.bookingNumber,
      paymentId: expPayment.id,
    },
    nonStaffCookie
  );
  assert(refundNonStaff.status === 403, 'Refund with a non-staff (GUEST) session returns HTTP 403');

  const stillPaidAfterDenied = await prisma.payment.findUniqueOrThrow({ where: { id: expPayment.id } });
  assert(
    stillPaidAfterDenied.status === PaymentStatus.PAID,
    'Denied refund attempts leave the payment in PAID status'
  );
  assert(gatewayRefundCalls === 0, 'Gateway refund API was not called by denied attempts');

  const refundStaff = await callRefund(
    {
      bookingType: 'EXPERIENCE',
      bookingNumber: expBooking.bookingNumber,
      paymentId: expPayment.id,
      reason: 'Admin payments suite refund',
    },
    defaultStaffCookie
  );
  assert(refundStaff.status === 200, 'Refund with a staff session returns HTTP 200');
  assert(refundStaff.json?.data?.status === 'REFUNDED', 'Refund response reports status REFUNDED');
  assert(Boolean(refundStaff.json?.data?.refundId), 'Refund response reports the gateway refund id');
  assert(gatewayRefundCalls === 1, 'Gateway refund API called exactly once by the authorized attempt');

  const rawRefundBody = JSON.stringify(refundStaff.json);
  assert(!rawRefundBody.includes('providerSignature'), 'Refund payload never contains providerSignature');
  assert(!rawRefundBody.includes('idempotencyKey'), 'Refund payload never contains idempotencyKey');
  assert(!rawRefundBody.includes('metadata'), 'Refund payload never contains metadata');

  const refundedDetail = await callDetail(expPayment.id, defaultStaffCookie);
  assert(refundedDetail.status === 200, 'Refunded payment detail still reachable');
  assert(refundedDetail.json?.data?.status === 'REFUNDED', 'Detail reflects REFUNDED status after refund');
  assert(
    typeof refundedDetail.json?.data?.refundId === 'string',
    'Detail exposes the recorded refund id'
  );
  assert(
    typeof refundedDetail.json?.data?.refundAmount === 'string',
    'Detail exposes the recorded refund amount'
  );
  assert(
    typeof refundedDetail.json?.data?.refundReason === 'string',
    'Detail exposes the recorded refund reason'
  );

  const refundedFilter = await callList({ status: 'REFUNDED', pageSize: '50' }, defaultStaffCookie);
  assert(
    (refundedFilter.json?.data?.payments ?? []).some((p: { id: string }) => p.id === expPayment.id),
    'status=REFUNDED filter finds the refunded payment'
  );

  const refundedExpFilter = await callList(
    { status: 'REFUNDED', bookingType: 'EXPERIENCE' },
    defaultStaffCookie
  );
  assert(
    (refundedExpFilter.json?.data?.payments ?? []).some((p: { id: string }) => p.id === expPayment.id),
    'Combined status + bookingType filters work together'
  );

  // ------------------------------------------------------------ 12. Cleanup
  console.log('\n10. Performing Strict Database Cleanup:');

  await prisma.notification.deleteMany({ where: { recipient: { in: testRecipientEmails } } });

  await prisma.payment.deleteMany({
    where: {
      OR: [
        { bookingId: { in: createdBookingIds } },
        { eventBookingId: { in: createdEventBookingIds } },
      ],
    },
  });

  await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
  await prisma.eventBookingStatusHistory.deleteMany({
    where: { eventBookingId: { in: createdEventBookingIds } },
  });

  await prisma.bookingItem.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
  await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });

  await prisma.eventBookingTicket.deleteMany({
    where: { eventBookingId: { in: createdEventBookingIds } },
  });
  await prisma.eventBooking.deleteMany({ where: { id: { in: createdEventBookingIds } } });

  await prisma.eventTicketType.update({
    where: { id: ticketType.id },
    data: { soldCount: originalSoldCount },
  });

  await prisma.winery.delete({ where: { id: foreignWinery.id } });

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
  const finalWineries = await prisma.winery.count();
  const finalGuestProfiles = await prisma.guestProfile.count();

  console.log(
    `   bookings=${finalBookings} eventBookings=${finalEventBookings} ` +
      `payments=${finalPayments} wineries=${finalWineries} guestProfiles=${finalGuestProfiles}`
  );
  assert(finalBookings === initialBookings, `Bookings restored to ${initialBookings} (found: ${finalBookings})`);
  assert(
    finalEventBookings === initialEventBookings,
    `Event bookings restored to ${initialEventBookings} (found: ${finalEventBookings})`
  );
  assert(finalPayments === initialPayments, `Payments restored to ${initialPayments} (found: ${finalPayments})`);
  assert(finalWineries === initialWineries, `Wineries restored to ${initialWineries} (found: ${finalWineries})`);
  assert(
    finalGuestProfiles === initialGuestProfiles,
    `Guest profiles restored to ${initialGuestProfiles} (found: ${finalGuestProfiles})`
  );

  console.log(`\n=== Phase 7.0G Test Summary: ${passed} passed, ${failed} failed ===`);
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

/**
 * Admin Review Moderation Test Suite (Phase 6.9)
 *
 * Usage:
 *   npx tsx scripts/test-admin-review-moderation.ts
 */
import { PrismaClient, ReviewCategory, ReviewStatus, UserRole } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SignJWT } from 'jose';
import { AdminReviewService } from '../src/server/services';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

function loadDotEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env optional
  }
  return out;
}

const DOTENV = loadDotEnv();
const ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || DOTENV.INITIAL_ADMIN_EMAIL || 'admin@mywinery.com';
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || DOTENV.INITIAL_ADMIN_PASSWORD || '12345678';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || DOTENV.ADMIN_JWT_SECRET || '';

const GUEST_EMAIL = `mod-guest-${RUN}@example.com`;
const GUEST_PASS = 'Mod#TestPass2026!';
const GUEST_NAME = 'Moderation Test Guest';

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${name}${details ? ' - ' + details : ''}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${name}${details ? ' - ' + details : ''}`);
  }
}

let ipCounter = 1;
function freshIp(): string {
  return `10.99.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
}

class CookieJar {
  private cookies = new Map<string, string>();
  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  absorb(res: Response) {
    const raw = res.headers.getSetCookie?.() || [];
    if (raw.length === 0) {
      const single = res.headers.get('set-cookie');
      if (single) raw.push(single);
    }
    for (const c of raw) {
      const match = c.match(/^([^=;]+)=([^;]*)/);
      if (match) {
        this.cookies.set(match[1].trim(), match[2].trim());
      }
    }
  }
}

async function loginAdmin(jar: CookieJar) {
  const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  jar.absorb(res);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success) };
}

async function registerGuest(jar: CookieJar) {
  const res = await fetch(`${BASE_URL}/api/auth/guest/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify({
      email: GUEST_EMAIL,
      password: GUEST_PASS,
      confirmPassword: GUEST_PASS,
      name: GUEST_NAME,
    }),
  });
  jar.absorb(res);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: Boolean(json?.success) };
}

async function patchAdminReview(jar: CookieJar | null, id: string, body: unknown) {
  const res = await fetch(`${BASE_URL}/api/admin/reviews/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function getAdminReviewById(jar: CookieJar | null, id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/reviews/${id}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function getAdminReviews(jar: CookieJar | null, query = '') {
  const res = await fetch(`${BASE_URL}/api/admin/reviews${query}`, {
    headers: {
      ...(jar ? { Cookie: jar.header() } : {}),
      'x-forwarded-for': freshIp(),
    },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function getPublicReviews() {
  const res = await fetch(`${BASE_URL}/api/reviews`, {
    headers: { 'x-forwarded-for': freshIp() },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  console.log(`\n==================================================`);
  console.log(`Starting Phase 6.9 Admin Review Moderation Test Suite`);
  console.log(`Run ID: ${RUN}`);
  console.log(`==================================================\n`);

  // Target records created during this test run for safe cleanup
  const createdReviewIds: string[] = [];

  try {
    // 1. Database prerequisites
    const winery = await prisma.winery.findFirst({
      where: { slug: 'domaine-elysee' },
      select: { id: true, name: true },
    });
    if (!winery) {
      throw new Error('Default winery (domaine-elysee) not found');
    }

    const wine = await prisma.wine.findFirst({
      where: { wineryId: winery.id },
      select: { id: true, name: true, slug: true },
    });
    const experience = await prisma.experience.findFirst({
      where: { wineryId: winery.id },
      select: { id: true, title: true, slug: true },
    });
    const event = await prisma.event.findFirst({
      where: { wineryId: winery.id },
      select: { id: true, title: true, slug: true },
    });

    if (!wine || !experience || !event) {
      throw new Error('Required fixtures (wine, experience, event) not found');
    }

    // 2. Authentication setup
    const adminJar = new CookieJar();
    const adminLoginRes = await loginAdmin(adminJar);
    assert(adminLoginRes.status === 200 && adminLoginRes.ok, 'Admin setup: Logged in successfully');

    const guestJar = new CookieJar();
    const guestRegRes = await registerGuest(guestJar);
    assert(guestRegRes.status === 201 && guestRegRes.ok, 'Guest setup: Registered guest successfully');

    const guestUser = await prisma.user.findUnique({
      where: { email: GUEST_EMAIL },
      include: { guestProfile: true },
    });
    const guestProfileId = guestUser?.guestProfile?.id || null;

    // 3. Create test reviews directly in PENDING state
    // Wine Review A (for approve)
    const wineRevA = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 5,
        title: `[MOD-${RUN}] Exceptional Wine A`,
        comment: 'This wine had splendid character and great complexity throughout.',
        category: ReviewCategory.WINE_TASTING,
        targetName: wine.name,
        wineId: wine.id,
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(wineRevA.id);

    // Wine Review B (for reject)
    const wineRevB = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 2,
        title: `[MOD-${RUN}] Disappointing Wine B`,
        comment: 'The acidity was overpowering and did not match the tasting notes.',
        category: ReviewCategory.WINE_TASTING,
        targetName: wine.name,
        wineId: wine.id,
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(wineRevB.id);

    // Experience Review A (for approve)
    const expRevA = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 5,
        title: `[MOD-${RUN}] Sublime Experience A`,
        comment: 'The cellar tour was breathtaking and the sommelier was immensely knowledgeable.',
        category: ReviewCategory.VINEYARD_TOUR,
        targetName: experience.title,
        experienceId: experience.id,
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(expRevA.id);

    // Experience Review B (for reject)
    const expRevB = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 1,
        title: `[MOD-${RUN}] Inappropriate Experience B`,
        comment: 'Spam text and abusive contents that should not be visible anywhere.',
        category: ReviewCategory.VINEYARD_TOUR,
        targetName: experience.title,
        experienceId: experience.id,
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(expRevB.id);

    // Event Review A (for approve)
    const evtRevA = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 5,
        title: `[MOD-${RUN}] Grand Harvest Event A`,
        comment: 'A magical evening with pairings and acoustic strings in the vineyard.',
        category: ReviewCategory.EVENTS,
        targetName: event.title,
        eventId: event.id,
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(evtRevA.id);

    // Event Review B (for reject)
    const evtRevB = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 1,
        title: `[MOD-${RUN}] Unrelated Event B`,
        comment: 'Completely off topic promotional solicitation comment text.',
        category: ReviewCategory.EVENTS,
        targetName: event.title,
        eventId: event.id,
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(evtRevB.id);

    // Review C for State and Security Tests
    const secRev = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 4,
        title: `[MOD-${RUN}] Security Test Review`,
        comment: 'Security test review to test forged fields, transitions, and idempotency.',
        category: ReviewCategory.FOOD,
        targetName: 'Culinary Estate Pairing',
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(secRev.id);

    console.log(`Created 7 test reviews in PENDING status for Run: ${RUN}`);

    // ==================================================================
    // AUTH TESTS
    // ==================================================================
    console.log('\n--- Section 1: Authentication & Authorization ---');

    // A. Unauthenticated moderation request -> 401
    const resA = await patchAdminReview(null, wineRevA.id, { action: 'APPROVE' });
    assert(resA.status === 401, 'A. Unauthenticated moderation request → 401', `status: ${resA.status}`);

    // B. Guest session moderation request -> 401 (guest has no admin session cookie)
    const resB = await patchAdminReview(guestJar, wineRevA.id, { action: 'APPROVE' });
    assert(
      resB.status === 401 || resB.status === 403,
      'B. Guest session moderation request → 401 or 403',
      `status: ${resB.status}`
    );

    // C. Staff/admin authorized moderation succeeds
    const resC = await patchAdminReview(adminJar, wineRevA.id, { action: 'APPROVE' });
    assert(
      resC.status === 200 && resC.json?.success === true && resC.json?.data?.status === 'APPROVED',
      'C. Staff/admin authorized moderation succeeds',
      `status: ${resC.status}`
    );

    // D. Unauthorized role -> 403
    // Generate valid admin token signed with ADMIN_JWT_SECRET, but with role = GUEST (non-staff)
    const secretKey = new TextEncoder().encode(ADMIN_JWT_SECRET);
    const nonStaffToken = await new SignJWT({
      userId: 'test-non-staff-id',
      email: 'nonstaff@example.com',
      role: UserRole.GUEST,
      wineryId: winery.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secretKey);

    const nonStaffJar = new CookieJar();
    const fakeRes = new Response('', {
      headers: { 'set-cookie': `elysee_admin_session=${nonStaffToken}; Path=/; HttpOnly` },
    });
    nonStaffJar.absorb(fakeRes);

    const resD = await patchAdminReview(nonStaffJar, wineRevB.id, { action: 'REJECT' });
    assert(resD.status === 403, 'D. Unauthorized role → 403', `status: ${resD.status}`);

    // ==================================================================
    // VISIBILITY TESTS
    // ==================================================================
    console.log('\n--- Section 2: Visibility & Filtering ---');

    // E. Admin can list PENDING reviews
    const resE = await getAdminReviews(adminJar, '?status=PENDING');
    const allPending = (resE.json?.data?.items ?? []).every((r: { status: string }) => r.status === 'PENDING');
    assert(
      resE.status === 200 && allPending && (resE.json?.data?.items ?? []).length > 0,
      'E. Admin can list PENDING reviews',
      `items: ${resE.json?.data?.items?.length}`
    );

    // F. Admin can list APPROVED reviews
    const resF = await getAdminReviews(adminJar, '?status=APPROVED');
    const allApproved = (resF.json?.data?.items ?? []).every((r: { status: string }) => r.status === 'APPROVED');
    assert(
      resF.status === 200 && allApproved && (resF.json?.data?.items ?? []).some((r: { id: string }) => r.id === wineRevA.id),
      'F. Admin can list APPROVED reviews',
      `contains approved wineRevA: true`
    );

    // G. Admin can list REJECTED reviews
    // Moderate wineRevB first so we have a REJECTED review
    await patchAdminReview(adminJar, wineRevB.id, { action: 'REJECT' });
    const resG = await getAdminReviews(adminJar, '?status=REJECTED');
    const allRejected = (resG.json?.data?.items ?? []).every((r: { status: string }) => r.status === 'REJECTED');
    assert(
      resG.status === 200 && allRejected && (resG.json?.data?.items ?? []).some((r: { id: string }) => r.id === wineRevB.id),
      'G. Admin can list REJECTED reviews',
      `contains rejected wineRevB: true`
    );

    // H. Invalid status filter -> 400
    const resH = await getAdminReviews(adminJar, '?status=INVALID_STATUS');
    assert(resH.status === 400, 'H. Invalid status filter → 400', `status: ${resH.status}`);

    // ==================================================================
    // APPROVE TESTS
    // ==================================================================
    console.log('\n--- Section 3: Approve Workflow ---');

    // I. PENDING wine review -> APPROVED (already verified in test C, let's verify item properties)
    assert(
      resC.json?.data?.category === 'WINE_TASTING' && resC.json?.data?.wine?.id === wine.id,
      'I. PENDING wine review → APPROVED',
      `target: ${resC.json?.data?.targetName}, status: ${resC.json?.data?.status}`
    );

    // J. PENDING experience review -> APPROVED
    const resJ = await patchAdminReview(adminJar, expRevA.id, { action: 'APPROVE' });
    assert(
      resJ.status === 200 && resJ.json?.data?.status === 'APPROVED' && resJ.json?.data?.experience?.id === experience.id,
      'J. PENDING experience review → APPROVED',
      `status: ${resJ.json?.data?.status}`
    );

    // K. PENDING event review -> APPROVED
    const resK = await patchAdminReview(adminJar, evtRevA.id, { action: 'APPROVE' });
    assert(
      resK.status === 200 && resK.json?.data?.status === 'APPROVED' && resK.json?.data?.event?.id === event.id,
      'K. PENDING event review → APPROVED',
      `status: ${resK.json?.data?.status}`
    );

    // ==================================================================
    // REJECT TESTS
    // ==================================================================
    console.log('\n--- Section 4: Reject Workflow ---');

    // L. PENDING wine review -> REJECTED (already set in step G, check properties)
    const detailL = await getAdminReviewById(adminJar, wineRevB.id);
    assert(
      detailL.status === 200 && detailL.json?.data?.status === 'REJECTED' && detailL.json?.data?.wine?.id === wine.id,
      'L. PENDING wine review → REJECTED',
      `status: ${detailL.json?.data?.status}`
    );

    // M. PENDING experience review -> REJECTED
    const resM = await patchAdminReview(adminJar, expRevB.id, { action: 'REJECT' });
    assert(
      resM.status === 200 && resM.json?.data?.status === 'REJECTED' && resM.json?.data?.experience?.id === experience.id,
      'M. PENDING experience review → REJECTED',
      `status: ${resM.json?.data?.status}`
    );

    // N. PENDING event review -> REJECTED
    const resN = await patchAdminReview(adminJar, evtRevB.id, { action: 'REJECT' });
    assert(
      resN.status === 200 && resN.json?.data?.status === 'REJECTED' && resN.json?.data?.event?.id === event.id,
      'N. PENDING event review → REJECTED',
      `status: ${resN.json?.data?.status}`
    );

    // ==================================================================
    // SECURITY TESTS
    // ==================================================================
    console.log('\n--- Section 5: Security & Validation ---');

    // O. Forged status cannot bypass action validation
    // Sending { status: 'APPROVED' } without action must return 400
    const resO1 = await patchAdminReview(adminJar, secRev.id, { status: 'APPROVED' });
    assert(resO1.status === 400, 'O1. Missing action / raw status parameter rejected → 400', `status: ${resO1.status}`);

    // Sending { action: 'REJECT', status: 'APPROVED' } must reject and NOT approve
    const resO2 = await patchAdminReview(adminJar, secRev.id, { action: 'REJECT', status: 'APPROVED' });
    assert(
      resO2.status === 200 && resO2.json?.data?.status === 'REJECTED',
      'O2. Forged status ignored; action governs transition → REJECTED',
      `actual status: ${resO2.json?.data?.status}`
    );

    // P. Forged verified field cannot be client-controlled
    await patchAdminReview(adminJar, expRevA.id, { action: 'APPROVE', verified: false });
    const freshExpA = await prisma.review.findUnique({ where: { id: expRevA.id } });
    assert(
      freshExpA?.verified === true,
      'P. Forged verified field cannot be client-controlled',
      `verified remains: ${freshExpA?.verified}`
    );

    // Q. Forged wineryId cannot cross tenant boundary
    let tenantBoundaryEnforced = false;
    try {
      await AdminReviewService.moderateReview(
        secRev.id,
        { action: 'REJECT' },
        { wineryId: 'fake-alien-winery-tenant' }
      );
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 403) {
        tenantBoundaryEnforced = true;
      }
    }
    assert(tenantBoundaryEnforced, 'Q. Forged wineryId cannot cross tenant boundary → 403');

    // R. Guest cannot moderate review
    // Attempting to PATCH /api/auth/guest/reviews/${id} returns 405 (Method Not Allowed)
    const resR1 = await fetch(`${BASE_URL}/api/auth/guest/reviews/${secRev.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: guestJar.header(),
        'x-forwarded-for': freshIp(),
      },
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    // Attempting to PATCH /api/admin/reviews/${id} with guest cookie returns 401/403
    const resR2 = await patchAdminReview(guestJar, secRev.id, { action: 'APPROVE' });
    assert(
      resR1.status === 405 && (resR2.status === 401 || resR2.status === 403),
      'R. Guest cannot moderate review (guest route 405, admin route 401/403)',
      `guestRoute: ${resR1.status}, adminRoute: ${resR2.status}`
    );

    // S. Wrong/nonexistent review ID -> 404
    const resS = await patchAdminReview(adminJar, '00000000-0000-0000-0000-000000000000', { action: 'APPROVE' });
    assert(resS.status === 404, 'S. Wrong/nonexistent review ID → 404', `status: ${resS.status}`);

    // T. Invalid action -> 400
    const resT1 = await patchAdminReview(adminJar, secRev.id, { action: 'DELETE' });
    const resT2 = await patchAdminReview(adminJar, secRev.id, { action: 'PENDING' });
    assert(
      resT1.status === 400 && resT2.status === 400,
      'T. Invalid actions (DELETE, PENDING) → 400',
      `DELETE: ${resT1.status}, PENDING: ${resT2.status}`
    );

    // ==================================================================
    // STATE TRANSITIONS & IDEMPOTENCY
    // ==================================================================
    console.log('\n--- Section 6: State Transitions & Idempotency ---');

    // U. Invalid state transition handled correctly
    // expRevA is APPROVED. Attempting to REJECT it must return 409 Conflict.
    const resU1 = await patchAdminReview(adminJar, expRevA.id, { action: 'REJECT' });
    // wineRevB is REJECTED. Attempting to APPROVE it must return 409 Conflict.
    const resU2 = await patchAdminReview(adminJar, wineRevB.id, { action: 'APPROVE' });
    assert(
      resU1.status === 409 && resU2.status === 409,
      'U. Invalid state transition blocked → 409 Conflict',
      `APPROVED->REJECT: ${resU1.status}, REJECTED->APPROVE: ${resU2.status}`
    );

    // V. Repeated APPROVE behaves according to defined idempotency
    const resV = await patchAdminReview(adminJar, expRevA.id, { action: 'APPROVE' });
    assert(
      resV.status === 200 && resV.json?.data?.status === 'APPROVED',
      'V. Repeated APPROVE behaves according to defined idempotency → 200 OK',
      `status: ${resV.status}`
    );

    // W. Repeated REJECT behaves according to defined idempotency
    const resW = await patchAdminReview(adminJar, wineRevB.id, { action: 'REJECT' });
    assert(
      resW.status === 200 && resW.json?.data?.status === 'REJECTED',
      'W. Repeated REJECT behaves according to defined idempotency → 200 OK',
      `status: ${resW.status}`
    );

    // X. Approved/rejected status persists after fresh DB read
    const [dbExpA, dbWineB] = await Promise.all([
      prisma.review.findUnique({ where: { id: expRevA.id } }),
      prisma.review.findUnique({ where: { id: wineRevB.id } }),
    ]);
    assert(
      dbExpA?.status === ReviewStatus.APPROVED && dbWineB?.status === ReviewStatus.REJECTED,
      'X. Approved/rejected status persists in database after fresh read',
      `ExpA: ${dbExpA?.status}, WineB: ${dbWineB?.status}`
    );

    // ==================================================================
    // PUBLIC VISIBILITY
    // ==================================================================
    console.log('\n--- Section 7: Public Review Visibility ---');

    // Create a temporary fresh PENDING review specifically for public query verification
    const pendingTestRev = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId,
        authorName: GUEST_NAME,
        rating: 5,
        title: `[MOD-${RUN}] Temporary Pending Check`,
        comment: 'This is a pending review that must never appear in public listings.',
        category: ReviewCategory.WINE_TASTING,
        targetName: wine.name,
        wineId: wine.id,
        status: ReviewStatus.PENDING,
        verified: true,
      },
    });
    createdReviewIds.push(pendingTestRev.id);

    const publicRes = await getPublicReviews();
    const publicItems = publicRes.json?.data ?? [];
    const publicIds = new Set(publicItems.map((r: { id: string }) => r.id));

    // Y. PENDING review is not publicly visible
    assert(
      !publicIds.has(pendingTestRev.id),
      'Y. PENDING review is not publicly visible on GET /api/reviews',
      `pending id absent: true`
    );

    // Z. REJECTED review is not publicly visible
    assert(
      !publicIds.has(wineRevB.id) && !publicIds.has(expRevB.id) && !publicIds.has(evtRevB.id),
      'Z. REJECTED reviews are not publicly visible on GET /api/reviews',
      `rejected ids absent: true`
    );

    // AA. APPROVED review is publicly visible where existing architecture supports that target
    assert(
      publicIds.has(wineRevA.id) || publicIds.has(expRevA.id) || publicIds.has(evtRevA.id),
      'AA. APPROVED review is publicly visible on GET /api/reviews',
      `contains approved test review: true`
    );

    // ==================================================================
    // DATA SECURITY & SECRETS
    // ==================================================================
    console.log('\n--- Section 8: Data Security & Secret Leakage ---');

    const adminDetailStr = JSON.stringify(detailL.json);
    // AB. Admin response contains no passwordHash
    assert(
      !adminDetailStr.includes('passwordHash'),
      'AB. Admin response contains no passwordHash',
      `hasPasswordHash: false`
    );

    // AC. Admin response contains no JWT/session secret
    assert(
      !adminDetailStr.includes(ADMIN_JWT_SECRET),
      'AC. Admin response contains no JWT/session secret',
      `hasAdminJwtSecret: false`
    );

    // AD. Guest response contains no moderation internals beyond existing safe status
    const guestReviewsRes = await fetch(`${BASE_URL}/api/auth/guest/reviews`, {
      headers: {
        Cookie: guestJar.header(),
        'x-forwarded-for': freshIp(),
      },
    });
    const guestReviewsJson = await guestReviewsRes.json();
    const guestStr = JSON.stringify(guestReviewsJson);
    assert(
      !guestStr.includes('passwordHash') && !guestStr.includes('rejectionReason'),
      'AD. Guest response contains no internal moderation secrets',
      `safe DTO: true`
    );
  } finally {
    // ==================================================================
    // CLEANUP
    // ==================================================================
    console.log('\n--- Section 9: Test Data Cleanup ---');

    try {
      if (createdReviewIds.length > 0) {
        await prisma.review.deleteMany({
          where: { id: { in: createdReviewIds } },
        });
      }

      // Clean up test guest account
      const testGuest = await prisma.user.findUnique({
        where: { email: GUEST_EMAIL },
        include: { guestProfile: true },
      });
      if (testGuest) {
        if (testGuest.guestProfile) {
          await prisma.guestProfile.delete({ where: { id: testGuest.guestProfile.id } });
        }
        await prisma.user.delete({ where: { id: testGuest.id } });
      }

      const residualReviews = await prisma.review.count({
        where: { id: { in: createdReviewIds } },
      });
      const residualUser = await prisma.user.count({
        where: { email: GUEST_EMAIL },
      });

      // AE. All test data removed
      assert(
        residualReviews === 0 && residualUser === 0,
        'AE. All test data removed safely',
        `residual reviews: ${residualReviews}, residual users: ${residualUser}`
      );

      // AF. Legitimate winery data untouched
      const legitimateWinery = await prisma.winery.findFirst({
        where: { slug: 'domaine-elysee' },
      });
      assert(
        legitimateWinery !== null,
        'AF. Legitimate winery data untouched',
        `winery name: ${legitimateWinery?.name}`
      );
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
      assert(false, 'Cleanup failed with error', String(cleanupErr));
    }
  }

  console.log(`\n==================================================`);
  console.log(`PHASE 6.9 TEST SUITE SUMMARY:`);
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

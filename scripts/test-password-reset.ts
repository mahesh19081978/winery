/**
 * Guest Forgot / Reset Password Test Suite (Phase 6.1 add-on)
 *
 * Usage:
 *   1. Start the dev server:  npm run dev
 *   2. Run:                   npx tsx scripts/test-password-reset.ts
 *   Optional: TEST_BASE_URL=http://localhost:3001 npx tsx scripts/test-password-reset.ts
 *
 * Covers: generic forgot-password responses (no account enumeration), GUEST-only
 * token issuance, opaque token + SHA-256 hash-at-rest, single-use tokens, 1h expiry,
 * invalidation of previous tokens on new request, transactional password update,
 * old-password rejection, staff/admin role enforcement, rate limiting on both
 * endpoints, cookie clearing on reset, and response hygiene (no secrets leaked).
 *
 * Token extraction: the dev email provider writes messages to .email-outbox as
 * JSON files, so tests can read the raw reset URL without any API exposure.
 * Cleans up all test users (and their tokens, via cascade) on exit.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

const EMAIL_A = `reset-${RUN}-a@example.com`;
const EMAIL_GHOST = `reset-${RUN}-ghost@example.com`;
const EMAIL_STAFF = `reset-${RUN}-staff@example.com`;
const PASS_A = 'Cellar#Door2026!';
const PASS_B = 'Vineyard#New2026!';
const GENERIC_FORGOT = 'If an account exists for this email, a password reset link has been sent.';
const GENERIC_RESET_ERROR = 'This password reset link is invalid or has expired. Please request a new one.';

const OUTBOX_DIR = process.env.EMAIL_OUTBOX_DIR || path.join(process.cwd(), '.email-outbox');

let passed = 0;
let failed = 0;
let total = 0;

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
  return `10.88.${Math.floor(Math.random() * 250) + 1}.${ipCounter++}`;
}

class CookieJar {
  private cookies = new Map<string, string>();
  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  has(name: string): boolean {
    return this.cookies.has(name);
  }
  store(res: Response) {
    const headers = res.headers as unknown as { getSetCookie?: () => string[] };
    const setCookies = headers.getSetCookie?.() || [];
    for (const c of setCookies) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      if (idx < 0) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === '' || /max-age=0/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
}

interface ApiResult {
  status: number;
  json: { success?: boolean; data?: unknown; error?: string; message?: string } | null;
  text: string;
  headers: Headers;
}

async function api(
  path: string,
  opts: { method?: string; body?: unknown; jar?: CookieJar; ip?: string } = {}
): Promise<ApiResult> {
  const headers: Record<string, string> = { 'x-forwarded-for': opts.ip || freshIp() };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.jar && opts.jar.header()) headers['Cookie'] = opts.jar.header();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
  });
  if (opts.jar) opts.jar.store(res);
  const text = await res.text();
  let json: ApiResult['json'] = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON response
  }
  return { status: res.status, json, text, headers: res.headers };
}

interface OutboxMail {
  token: string;
  subject: string;
  html: string;
  text: string;
}

async function readLatestOutboxMail(email: string): Promise<OutboxMail | null> {
  let files: string[];
  try {
    files = await readdir(OUTBOX_DIR);
  } catch {
    return null;
  }
  const stamped = files
    .map((f) => ({ m: f.match(/^(\d+)-[0-9a-f-]+\.json$/i), file: f }))
    .filter((x): x is { m: RegExpMatchArray; file: string } => !!x.m)
    .map((x) => ({ ts: Number(x.m[1]), file: x.file }))
    .sort((a, b) => b.ts - a.ts);

  for (const { file } of stamped) {
    try {
      const raw = JSON.parse(await readFile(path.join(OUTBOX_DIR, file), 'utf8')) as {
        to?: string; subject?: string; html?: string; text?: string;
      };
      if (raw.to !== email || !raw.html) continue;
      const m = raw.html.match(/\/reset-password\?token=([A-Za-z0-9_-]+)/);
      if (m) {
        return { token: m[1], subject: raw.subject || '', html: raw.html, text: raw.text || '' };
      }
    } catch {
      // skip unreadable file
    }
  }
  return null;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function cleanup() {
  const deleted = await prisma.user.deleteMany({
    where: { email: { startsWith: `reset-${RUN}` } },
  });
  console.log(`\n🧹 Cleanup: removed ${deleted.count} test user(s) and their reset tokens.`);
}

async function main() {
  console.log(`\n🔑 Guest Password Reset Test Suite — target: ${BASE_URL} (run: ${RUN})\n`);

  try {
    await api('/api/auth/guest/me');
  } catch {
    console.error(`\n❌ Cannot reach ${BASE_URL}. Start the dev server first (npm run dev).`);
    process.exit(1);
  }

  // Setup: guest account via API, staff account directly in DB
  const jar = new CookieJar();
  const reg = await api('/api/auth/guest/register', {
    method: 'POST',
    jar,
    body: { name: 'Reset Test Guest', email: EMAIL_A, password: PASS_A, confirmPassword: PASS_A },
  });
  assert(reg.status === 201, 'Setup: guest account registered', `status=${reg.status}`);

  const staffHash = await bcrypt.hash('Staff#Secret2026!', 12);
  await prisma.user.create({
    data: { email: EMAIL_STAFF, passwordHash: staffHash, role: 'ADMIN' },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Forgot password: existing guest email → generic success
  // ─────────────────────────────────────────────────────────────────────────
  const forgotA = await api('/api/auth/guest/forgot-password', {
    method: 'POST',
    body: { email: EMAIL_A },
  });
  assert(
    forgotA.status === 200 && forgotA.json?.success === true && forgotA.json?.message === GENERIC_FORGOT,
    'Forgot-password for existing guest returns generic success',
    `status=${forgotA.status}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Forgot password: unknown email → same generic success (no enumeration)
  // ─────────────────────────────────────────────────────────────────────────
  const forgotGhost = await api('/api/auth/guest/forgot-password', {
    method: 'POST',
    body: { email: EMAIL_GHOST },
  });
  assert(
    forgotGhost.status === 200 && JSON.stringify(forgotGhost.json) === JSON.stringify(forgotA.json),
    'Forgot-password for unknown email returns byte-identical generic response'
  );
  const ghostTokens = await prisma.passwordResetToken.count({
    where: { user: { email: EMAIL_GHOST } },
  });
  assert(ghostTokens === 0, 'No reset token created for unknown email');

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Staff/admin email → generic success, but no token ever created
  // ─────────────────────────────────────────────────────────────────────────
  const forgotStaff = await api('/api/auth/guest/forgot-password', {
    method: 'POST',
    body: { email: EMAIL_STAFF },
  });
  assert(
    forgotStaff.status === 200 && JSON.stringify(forgotStaff.json) === JSON.stringify(forgotA.json),
    'Forgot-password for staff email returns identical generic response'
  );
  const staffTokens = await prisma.passwordResetToken.count({
    where: { user: { email: EMAIL_STAFF } },
  });
  assert(staffTokens === 0, 'No reset token created for admin/staff account');

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Token never appears in any API response
  // ─────────────────────────────────────────────────────────────────────────
  const serializedForgot = JSON.stringify({ forgotA: forgotA.json, forgotGhost: forgotGhost.json });
  assert(!serializedForgot.includes('token'), 'Forgot-password responses never contain a token');

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Reset email delivered (dev outbox) with link, branding, expiry, notice
  // ─────────────────────────────────────────────────────────────────────────
  const mail1 = await readLatestOutboxMail(EMAIL_A);
  assert(!!mail1, 'Reset email written to dev outbox');
  assert(
    !!mail1 && mail1.html.includes('VINORA') && mail1.subject.includes('Reset'),
    'Reset email carries winery branding and subject'
  );
  assert(
    !!mail1 && mail1.html.includes('1 hour') && /If you did not request a password reset/i.test(mail1.html),
    'Reset email states 1-hour expiry and security notice'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Token stored hashed (SHA-256), raw token only in the email link
  // ─────────────────────────────────────────────────────────────────────────
  const userA = await prisma.user.findUnique({ where: { email: EMAIL_A } });
  const tokenRow1 = await prisma.passwordResetToken.findFirst({
    where: { userId: userA!.id },
    orderBy: { createdAt: 'desc' },
  });
  assert(
    !!tokenRow1 && !!mail1 && tokenRow1.tokenHash === sha256(mail1.token) && tokenRow1.tokenHash !== mail1.token,
    'Reset token stored as SHA-256 hash; raw token only in email'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Happy path: logged-in guest resets password; session cookie cleared
  // ─────────────────────────────────────────────────────────────────────────
  const jarReset = new CookieJar();
  const loginOld = await api('/api/auth/guest/login', {
    method: 'POST',
    jar: jarReset,
    body: { email: EMAIL_A, password: PASS_A },
  });
  assert(loginOld.status === 200 && jarReset.has('elysee_guest_session'), 'Setup: guest logged in before reset');

  const reset1 = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    jar: jarReset,
    body: { token: mail1!.token, password: PASS_B, confirmPassword: PASS_B },
  });
  assert(
    reset1.status === 200 && reset1.json?.success === true,
    'Reset-password with valid token succeeds',
    `status=${reset1.status}`
  );
  assert(!jarReset.has('elysee_guest_session'), 'Reset clears the session cookie on this device');

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Old password rejected, new password accepted
  // ─────────────────────────────────────────────────────────────────────────
  const loginOldAfter = await api('/api/auth/guest/login', {
    method: 'POST',
    body: { email: EMAIL_A, password: PASS_A },
  });
  assert(loginOldAfter.status === 401, 'Old password no longer works after reset');
  const loginNew = await api('/api/auth/guest/login', {
    method: 'POST',
    body: { email: EMAIL_A, password: PASS_B },
  });
  assert(loginNew.status === 200, 'New password works after reset');

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Single-use: the consumed token cannot be reused
  // ─────────────────────────────────────────────────────────────────────────
  const reuse = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: mail1!.token, password: PASS_B, confirmPassword: PASS_B },
  });
  assert(
    reuse.status === 400 && reuse.json?.error === GENERIC_RESET_ERROR,
    'Used token is rejected with the generic invalid/expired message',
    `status=${reuse.status}`
  );
  const row1After = await prisma.passwordResetToken.findUnique({ where: { id: tokenRow1!.id } });
  assert(!!row1After?.usedAt, 'Consumed token is marked usedAt in the database');

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Garbage token → same generic message (no token-existence signal)
  // ─────────────────────────────────────────────────────────────────────────
  const garbage = randomBytes(32).toString('base64url');
  const badToken = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: garbage, password: PASS_B, confirmPassword: PASS_B },
  });
  assert(
    badToken.status === 400 && badToken.json?.error === GENERIC_RESET_ERROR,
    'Invalid token returns the same generic message as an expired/used one'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Validation: mismatched confirmation and weak password rejected
  // ─────────────────────────────────────────────────────────────────────────
  const forgotA2 = await api('/api/auth/guest/forgot-password', {
    method: 'POST',
    body: { email: EMAIL_A },
  });
  assert(forgotA2.status === 200, 'Setup: second forgot-password request succeeds');
  const mail2 = await readLatestOutboxMail(EMAIL_A);

  const mismatch = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: mail2!.token, password: PASS_B, confirmPassword: 'Different#Pass1' },
  });
  assert(
    mismatch.status === 400 && mismatch.json?.error === 'Passwords do not match',
    'Password confirmation mismatch rejected',
    `status=${mismatch.status}`
  );

  const weak = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: mail2!.token, password: 'short1', confirmPassword: 'short1' },
  });
  assert(weak.status === 400, 'Weak password (under 8 chars) rejected', `status=${weak.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 12. Expired token rejected with the generic message
  // ─────────────────────────────────────────────────────────────────────────────────────────
  const expiredRow = await prisma.passwordResetToken.findFirst({
    where: { userId: userA!.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.passwordResetToken.update({
    where: { id: expiredRow!.id },
    data: { expiresAt: new Date(Date.now() - 60 * 1000) },
  });
  const expiredAttempt = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: mail2!.token, password: PASS_B, confirmPassword: PASS_B },
  });
  assert(
    expiredAttempt.status === 400 && expiredAttempt.json?.error === GENERIC_RESET_ERROR,
    'Expired token rejected with the generic message'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 13. A newer request invalidates all previous unused tokens
  // ─────────────────────────────────────────────────────────────────────────
  await api('/api/auth/guest/forgot-password', { method: 'POST', body: { email: EMAIL_A } });
  const mail3 = await readLatestOutboxMail(EMAIL_A); // TA3
  await api('/api/auth/guest/forgot-password', { method: 'POST', body: { email: EMAIL_A } });
  const mail4 = await readLatestOutboxMail(EMAIL_A); // TA4 (newest)

  const oldTokenAttempt = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: mail3!.token, password: PASS_B, confirmPassword: PASS_B },
  });
  assert(
    oldTokenAttempt.status === 400 && oldTokenAttempt.json?.error === GENERIC_RESET_ERROR,
    'Previous unused token is invalidated by a newer request'
  );

  const PASS_C = 'Barrel#Age2026!';
  const newest = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: mail4!.token, password: PASS_C, confirmPassword: PASS_C },
  });
  assert(newest.status === 200, 'Newest token still works');
  const loginC = await api('/api/auth/guest/login', {
    method: 'POST',
    body: { email: EMAIL_A, password: PASS_C },
  });
  assert(loginC.status === 200, 'Password updated via newest token is accepted at login');

  // ─────────────────────────────────────────────────────────────────────────
  // 14. Role enforcement: a token row bound to an ADMIN user cannot reset
  // ─────────────────────────────────────────────────────────────────────────
  const staffUser = await prisma.user.findUnique({ where: { email: EMAIL_STAFF } });
  const staffRaw = randomBytes(32).toString('base64url');
  await prisma.passwordResetToken.create({
    data: {
      userId: staffUser!.id,
      tokenHash: sha256(staffRaw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const staffReset = await api('/api/auth/guest/reset-password', {
    method: 'POST',
    body: { token: staffRaw, password: 'Whatever#Pass1', confirmPassword: 'Whatever#Pass1' },
  });
  assert(
    staffReset.status === 400 && staffReset.json?.error === GENERIC_RESET_ERROR,
    'Guest reset flow refuses a token bound to an ADMIN user'
  );
  const staffAfter = await prisma.user.findUnique({ where: { email: EMAIL_STAFF } });
  assert(
    bcrypt.compareSync('Staff#Secret2026!', staffAfter!.passwordHash!),
    'Admin password unchanged after guest-flow reset attempt'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 15. Rate limiting: 6th request from one IP is 429 on both endpoints
  // ─────────────────────────────────────────────────────────────────────────
  const forgotRateIp = freshIp();
  let forgotSixth = 0;
  for (let i = 0; i < 6; i++) {
    const r = await api('/api/auth/guest/forgot-password', {
      method: 'POST',
      ip: forgotRateIp,
      body: { email: EMAIL_A },
    });
    if (i === 5) forgotSixth = r.status;
  }
  assert(forgotSixth === 429, 'Forgot-password rate limiter blocks 6th request from one IP', `status=${forgotSixth}`);

  const resetRateIp = freshIp();
  let resetSixth = 0;
  for (let i = 0; i < 6; i++) {
    const r = await api('/api/auth/guest/reset-password', {
      method: 'POST',
      ip: resetRateIp,
      body: { token: garbage, password: PASS_B, confirmPassword: PASS_B },
    });
    if (i === 5) resetSixth = r.status;
  }
  assert(resetSixth === 429, 'Reset-password rate limiter blocks 6th request from one IP', `status=${resetSixth}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 16. Response hygiene: no passwordHash / raw token anywhere
  // ─────────────────────────────────────────────────────────────────────────
  const allResponses = JSON.stringify({
    reg: reg.json, forgotA: forgotA.json, forgotGhost: forgotGhost.json, forgotStaff: forgotStaff.json,
    reset1: reset1.json, reuse: reuse.json, badToken: badToken.json, newest: newest.json,
  });
  assert(!allResponses.includes('passwordHash'), 'passwordHash never appears in API responses');
  const allTokens = [mail1?.token, mail2?.token, mail3?.token, mail4?.token, garbage, staffRaw];
  const leaked = allTokens.some((t) => t && allResponses.includes(t));
  assert(!leaked, 'No raw reset token appears in any API response');

  console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('💥 Test suite crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

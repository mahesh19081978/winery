import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { AuthService, type AdminSessionPayload } from '@/lib/auth';
import { can, type Permission, type StaffRole } from './permission-map';

/**
 * Centralized RBAC guards for the VINORA admin portal.
 *
 * Pure role/permission DATA lives in ./permission-map (single source of truth,
 * safe to import from client code). This module only holds the server-side
 * authorization guards used by admin pages and API route handlers.
 */

export * from './permission-map';

/** Authenticated staff session enriched with a DB-fresh, permission-checked role. */
export type AuthorizedSession = AdminSessionPayload & { role: StaffRole };

export type ApiPermissionResult =
  | { ok: true; session: AuthorizedSession }
  | { ok: false; response: NextResponse };

function deny(status: 401 | 403, error: string): ApiPermissionResult {
  return { ok: false, response: NextResponse.json({ success: false, error }, { status }) };
}

/**
 * Server-side page guard. Must run before any Prisma query or sensitive render.
 * Unauthenticated  -> /admin/login
 * Unauthorized     -> /admin/forbidden (never renders the page)
 */
export async function requirePagePermission(
  permission: Permission
): Promise<AuthorizedSession> {
  const { AdminAuthService } = await import('@/server/services');

  const session = await AdminAuthService.getActiveSession();
  if (!session) {
    redirect('/admin/login?error=account_inactive');
  }

  if (!can(session.role, permission)) {
    redirect(`/admin/forbidden?permission=${encodeURIComponent(permission)}`);
  }

  return session as AuthorizedSession;
}

/**
 * Server-side API guard for /api/admin/* handlers.
 *   no session      -> 401 { success:false, error:'Unauthorized' }
 *   wrong permission-> 403 { success:false, error:'Forbidden' }
 *
 * The session role is re-read from the database whenever the ambient cookie
 * store is available, so a demoted or deactivated account loses access before
 * its JWT expires. `request` is passed by handlers that must fall back to the
 * cookie carried by the incoming request.
 */
export async function requireApiPermission(
  permission: Permission,
  request?: NextRequest
): Promise<ApiPermissionResult> {
  const ambient = await AuthService.getSession();
  const jwt = request && !ambient ? await AuthService.getSessionFromRequest(request) : ambient;

  if (!jwt) return deny(401, 'Unauthorized');
  if (!AuthService.isStaffRole(jwt.role)) return deny(403, 'Forbidden');

  let role = jwt.role as StaffRole;
  let wineryId = jwt.wineryId;

  if (ambient) {
    const { AdminAuthService } = await import('@/server/services');
    const active = await AdminAuthService.getActiveSession();
    if (!active) return deny(401, 'Session is no longer active');
    role = active.role as StaffRole;
    wineryId = active.wineryId;
  }

  if (!can(role, permission)) return deny(403, 'Forbidden');

  return { ok: true, session: { ...jwt, role, wineryId } };
}

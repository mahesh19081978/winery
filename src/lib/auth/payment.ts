import { NextRequest } from 'next/server';
import { getGuestSession, GuestAuth, GUEST_AUTH_COOKIE_NAME } from '@/lib/auth/guest';
import { AuthService, ADMIN_AUTH_COOKIE_NAME } from '@/lib/auth';
import type { PaymentOwnershipContext } from '@/server/services';

/**
 * Resolves the payment ownership context from current request cookies (Guest session or Staff session).
 * Supports both standard Next.js cookies() context and fallback inspection of NextRequest cookies.
 */
export async function resolvePaymentOwnershipContext(request?: NextRequest): Promise<PaymentOwnershipContext> {
  let guestSession = await getGuestSession();
  let adminSession = await AuthService.getSession();

  if (!guestSession && request) {
    const guestCookie = request.cookies.get(GUEST_AUTH_COOKIE_NAME)?.value;
    if (guestCookie) {
      guestSession = await GuestAuth.verifySessionToken(guestCookie);
    }
  }

  if (!adminSession && request) {
    const adminCookie = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;
    if (adminCookie) {
      adminSession = await AuthService.verifySessionToken(adminCookie);
    }
  }

  const isStaff = Boolean(adminSession && AuthService.isStaffRole(adminSession.role));

  return {
    isStaff,
    guestProfileId: guestSession?.guestProfileId,
    email: guestSession?.email || adminSession?.email,
  };
}

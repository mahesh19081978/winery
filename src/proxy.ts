import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ADMIN_AUTH_COOKIE_NAME, getJwtSecretKey } from '@/lib/auth';

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'RECEPTION',
  'WINE_STAFF',
  'EVENT_MANAGER',
  'TELECALLER',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const key = getJwtSecretKey();
      const { payload } = await jwtVerify(token, key);
      const role = payload.role as string;

      // Disallow GUEST and non-staff roles
      if (!role || !STAFF_ROLES.includes(role)) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('error', 'unauthorized_role');
        return NextResponse.redirect(loginUrl);
      }

      // Valid staff session, proceed
      return NextResponse.next();
    } catch {
      // Missing secret or invalid/expired token: fail closed to login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in and visiting /admin/login, redirect to /admin
  if (pathname === '/admin/login') {
    const token = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;
    if (token) {
      try {
        const key = getJwtSecretKey();
        const { payload } = await jwtVerify(token, key);
        const role = payload.role as string;
        if (role && STAFF_ROLES.includes(role)) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      } catch {
        // Token invalid or secret error, allow visit to login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
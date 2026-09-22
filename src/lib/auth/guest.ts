import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { UserRole } from '@prisma/client';

export const GUEST_AUTH_COOKIE_NAME = 'elysee_guest_session';

const MIN_GUEST_SECRET_LENGTH = 32;

export function getGuestJwtSecretKey(): Uint8Array {
  const isProduction = process.env.NODE_ENV === 'production';

  let secret = process.env.GUEST_JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    if (isProduction) {
      // Production must fail closed: never share or fall back to the admin signing key.
      throw new Error(
        'GUEST_JWT_SECRET environment variable is required in production. Guest authentication is disabled.'
      );
    }
    // Development-only fallback to the admin secret. This branch is unreachable in production.
    secret = process.env.ADMIN_JWT_SECRET;
  }

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'GUEST_JWT_SECRET (or ADMIN_JWT_SECRET as a development-only fallback) is missing. Guest authentication is disabled.'
    );
  }

  if (secret.length < MIN_GUEST_SECRET_LENGTH) {
    throw new Error(
      `GUEST_JWT_SECRET must be at least ${MIN_GUEST_SECRET_LENGTH} characters long for secure operations.`
    );
  }

  return new TextEncoder().encode(secret);
}

export interface GuestSessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  guestProfileId: string;
  name: string;
}

export class GuestAuth {
  static async createSessionToken(payload: GuestSessionPayload): Promise<string> {
    const key = getGuestJwtSecretKey();
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(key);
  }

  static async verifySessionToken(token: string): Promise<GuestSessionPayload | null> {
    try {
      const key = getGuestJwtSecretKey();
      const { payload } = await jwtVerify(token, key);
      // Enforce GUEST role only
      if (payload.role !== UserRole.GUEST) return null;
      return {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as UserRole,
        guestProfileId: payload.guestProfileId as string,
        name: payload.name as string,
      };
    } catch {
      return null;
    }
  }

  static async getSession(): Promise<GuestSessionPayload | null> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(GUEST_AUTH_COOKIE_NAME)?.value;
      if (!token) return null;
      return this.verifySessionToken(token);
    } catch {
      return null;
    }
  }

  static async requireSession(): Promise<GuestSessionPayload> {
    const session = await this.getSession();
    if (!session) {
      throw new Error('Unauthenticated');
    }
    return session;
  }

  static async setSessionCookie(token: string): Promise<void> {
    try {
      const cookieStore = await cookies();
      cookieStore.set(GUEST_AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    } catch {
      // Outside request context
    }
  }

  static async clearSessionCookie(): Promise<void> {
    try {
      const cookieStore = await cookies();
      cookieStore.set(GUEST_AUTH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    } catch {
      // Outside request context
    }
  }
}

export async function getGuestSession(): Promise<GuestSessionPayload | null> {
  return GuestAuth.getSession();
}

export async function requireGuestSession(): Promise<GuestSessionPayload> {
  return GuestAuth.requireSession();
}

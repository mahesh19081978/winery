import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { UserRole } from '@prisma/client';

export const ADMIN_AUTH_COOKIE_NAME = 'elysee_admin_session';

/**
 * Validates and retrieves the JWT secret for admin authentication.
 * Fails closed if missing or fewer than 32 characters.
 */
export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error('ADMIN_JWT_SECRET environment variable is missing. Admin authentication is disabled.');
  }
  if (secret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET must be at least 32 characters long for secure operations.');
  }
  return new TextEncoder().encode(secret);
}

export interface AdminSessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  wineryId: string | null;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  static async createSessionToken(payload: AdminSessionPayload): Promise<string> {
    const key = getJwtSecretKey();
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h') // 8 hours session expiration
      .sign(key);
  }

  static async verifySessionToken(token: string): Promise<AdminSessionPayload | null> {
    try {
      const key = getJwtSecretKey();
      const { payload } = await jwtVerify(token, key);
      return {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as UserRole,
        wineryId: (payload.wineryId as string) || null,
      };
    } catch {
      return null;
    }
  }

  static async getSession(): Promise<AdminSessionPayload | null> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;
      if (!token) return null;
      return this.verifySessionToken(token);
    } catch {
      return null;
    }
  }

  static async setSessionCookie(token: string): Promise<void> {
    try {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      });
    } catch {
      // Running outside Next.js request context (e.g. CLI script or background job)
    }
  }

  static async clearSessionCookie(): Promise<void> {
    try {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_AUTH_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    } catch {
      // Running outside Next.js request context
    }
  }

  static isStaffRole(role: UserRole): boolean {
    const STAFF_ROLES: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.RECEPTION,
      UserRole.WINE_STAFF,
      UserRole.EVENT_MANAGER,
      UserRole.TELECALLER,
    ];
    return STAFF_ROLES.includes(role);
  }
}
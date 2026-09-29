import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const CONCIERGE_SESSION_COOKIE = 'concierge_session_id';

export class ConciergeSession {
  static async getSessionId(): Promise<string> {
    const cookieStore = await cookies();
    let sessionId = cookieStore.get(CONCIERGE_SESSION_COOKIE)?.value;

    if (!sessionId) {
      sessionId = randomUUID();
      cookieStore.set(CONCIERGE_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return sessionId;
  }

  static async resetSession(): Promise<string> {
    const cookieStore = await cookies();
    const newSessionId = randomUUID();
    cookieStore.set(CONCIERGE_SESSION_COOKIE, newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return newSessionId;
  }
}

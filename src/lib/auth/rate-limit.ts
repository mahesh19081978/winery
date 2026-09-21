/**
 * In-memory sliding-window rate limiter for brute-force login protection.
 *
 * NOTE & ARCHITECTURAL LIMITATION:
 * - This implementation is suitable for development and single-instance server environments only.
 * - It is NOT distributed across serverless instances or multi-container clusters (each container/instance
 *   maintains its own isolated memory state).
 * - Intended to be replaced by a shared store or distributed rate-limiting mechanism (e.g. Redis / Upstash)
 *   prior to production horizontal scaling.
 */
interface LoginAttempt {
  count: number;
  resetTime: number;
}

const attempts = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

export class RateLimiter {
  static isRateLimited(identifier: string): { limited: boolean; remainingSeconds?: number } {
    const now = Date.now();
    const attempt = attempts.get(identifier);

    if (!attempt || now > attempt.resetTime) {
      attempts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
      return { limited: false };
    }

    if (attempt.count >= MAX_ATTEMPTS) {
      const remainingSeconds = Math.ceil((attempt.resetTime - now) / 1000);
      return { limited: true, remainingSeconds };
    }

    attempt.count += 1;
    attempts.set(identifier, attempt);
    return { limited: false };
  }

  static reset(identifier: string): void {
    attempts.delete(identifier);
  }
}
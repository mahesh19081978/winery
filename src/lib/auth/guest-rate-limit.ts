/**
 * In-memory sliding-window rate limiter for guest authentication.
 *
 * NOTE & ARCHITECTURAL LIMITATION:
 * - Single-instance / single-container only. Each serverless instance maintains isolated memory.
 * - Replace with distributed store (Redis/Upstash) before horizontal scaling.
 * - Mirrors the existing admin limiter pattern.
 */
interface Attempt {
  count: number;
  resetTime: number;
}

const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export class GuestRateLimiter {
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

  static resetAll(): void {
    attempts.clear();
  }
}

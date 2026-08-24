/**
 * In-Memory Token Bucket / Sliding Window Rate Limiter.
 * Protects APIs from brute-force attacks, resource exhaustion, and noisy neighbors.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check if an identifier (e.g. API key ID or client IP) has exceeded the rate limit.
 *
 * @param identifier Unique tracking key (e.g. `key_123` or `ip_192.168.1.1`)
 * @param limit Maximum requests allowed within window (default: 120 reqs/min)
 * @param windowMs Window duration in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 120,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);

  if (record.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  return {
    allowed: true,
    limit,
    remaining,
    resetInSeconds,
  };
}

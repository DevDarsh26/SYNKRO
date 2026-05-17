/**
 * Simple in-memory rate limiter.
 * Uses a sliding-window algorithm per IP address.
 */

if (!globalThis.__rateLimitStore) {
  globalThis.__rateLimitStore = new Map();
}
const store = globalThis.__rateLimitStore;

/**
 * @param {Request} request  - Next.js request object
 * @param {object}  options
 * @param {number}  options.limit    - max requests per window
 * @param {number}  options.windowMs - window size in milliseconds
 * @returns {{ success: boolean, remaining: number, reset: number }}
 */
export function rateLimit(request, { limit = 10, windowMs = 60_000 } = {}) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const key = `${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or init the hit timestamps for this IP
  const hits = (store.get(key) || []).filter((t) => t > windowStart);
  hits.push(now);
  store.set(key, hits);

  const remaining = Math.max(0, limit - hits.length);
  const reset = Math.ceil((hits[0] + windowMs) / 1000); // Unix seconds

  return {
    success: hits.length <= limit,
    remaining,
    reset,
    limit,
  };
}

/**
 * Build rate-limit response headers.
 */
export function rateLimitHeaders({ limit, remaining, reset }) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  };
}

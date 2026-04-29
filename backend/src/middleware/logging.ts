import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../types';

/**
 * Request logging middleware.
 * Logs method, path, status, and response time.
 */
export const requestLogger = createMiddleware<AppBindings>(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      method,
      path,
      status,
      duration_ms: duration,
      cf_ray: c.req.header('cf-ray'),
      ip: c.req.header('cf-connecting-ip'),
    }),
  );
});

/**
 * Simple rate limiter using Cloudflare's cf-connecting-ip.
 * Tracks request counts in a Map (per-isolate, not distributed).
 * For production, use Cloudflare Rate Limiting rules or Workers KV.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const now = Date.now();

    let entry = requestCounts.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      requestCounts.set(ip, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      return c.json(
        { error: 'Too many requests', retryAfter: Math.ceil((entry.resetAt - now) / 1000) },
        429,
      );
    }

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));

    await next();
  });
}

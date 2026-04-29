import { createMiddleware } from 'hono/factory';
import type { Env, RuntimeConfig } from '../types';
import type { AuthUser } from './auth';
import { createDb } from '../db/index';

type AdminBindings = {
  Bindings: Env;
  Variables: {
    config: RuntimeConfig;
    user: AuthUser;
    db: ReturnType<typeof createDb>;
  };
};

function parseAdminEmails(env: Env): Set<string> {
  const raw = env.ADMIN_EMAILS;
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}

/**
 * Attaches a Drizzle DB client to the request context.
 * Must run before any route that touches the database.
 */
export const attachDb = createMiddleware<AdminBindings>(async (c, next) => {
  const db = createDb(c.env);
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503);
  }
  c.set('db', db);
  await next();
});

/**
 * Allows the request only if the authenticated user's email is in the
 * comma-separated `ADMIN_EMAILS` env var. Email comparison is case-insensitive.
 *
 * Single-tenant model: there is exactly one restaurant served by this
 * deployment, and admin access is binary — you're either listed in
 * `ADMIN_EMAILS` (full access to /admin) or you're not (403).
 *
 * Must be used AFTER `requireAuth`.
 */
export const requireAdmin = createMiddleware<AdminBindings>(async (c, next) => {
  const user = c.get('user');
  const admins = parseAdminEmails(c.env);

  if (admins.size === 0) {
    return c.json(
      { error: 'Forbidden', message: 'ADMIN_EMAILS not configured on this deployment' },
      403,
    );
  }

  if (!admins.has(user.email.toLowerCase())) {
    return c.json({ error: 'Forbidden', message: 'Not an admin' }, 403);
  }

  await next();
});

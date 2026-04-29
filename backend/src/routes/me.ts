import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { AppBindings } from '../types';

export const meRoutes = new Hono<AppBindings>()
  /**
   * GET /me — Returns the authenticated user's profile and admin status.
   *
   * Single-tenant model: every authed user gets back their Firebase profile
   * and a boolean indicating whether they are listed in `ADMIN_UIDS`.
   */
  .get('/', requireAuth, (c) => {
    const user = c.get('user');
    const adminUids = c.env.ADMIN_UIDS
      ? new Set(c.env.ADMIN_UIDS.split(',').map((s) => s.trim()).filter(Boolean))
      : new Set<string>();

    return c.json({
      uid: user.uid,
      email: user.email,
      name: user.name,
      isAdmin: adminUids.has(user.uid),
    });
  });

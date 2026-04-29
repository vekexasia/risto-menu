import { describe, it, expect, beforeAll } from 'vitest';
import { testRequest } from './helpers';
import { createTestDb, makeDbEnv, seedSettings, signTestJwt, installJwksMock } from './helpers/db';

beforeAll(() => installJwksMock());

/**
 * The admin guard is the security boundary for the whole `/admin/*` surface.
 * Tests here cover the requireAdmin middleware specifically; per-route CRUD
 * is tested in admin-crud.test.ts.
 */
describe('requireAdmin middleware', () => {
  it('returns 401 without auth', async () => {
    const db = createTestDb();
    seedSettings(db);
    const res = await testRequest('/admin/settings', { env: makeDbEnv(db) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when ADMIN_UIDS is unset', async () => {
    const db = createTestDb();
    seedSettings(db);
    const token = await signTestJwt('any-uid');
    const res = await testRequest('/admin/settings', {
      headers: { Authorization: `Bearer ${token}` },
      env: makeDbEnv(db),
    });
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, string>;
    expect(body.message).toMatch(/ADMIN_UIDS/);
  });

  it('returns 403 when ADMIN_UIDS is set but does not include the caller', async () => {
    const db = createTestDb();
    seedSettings(db);
    const token = await signTestJwt('not-admin');
    const res = await testRequest('/admin/settings', {
      headers: { Authorization: `Bearer ${token}` },
      env: makeDbEnv(db, { ADMIN_UIDS: 'admin-1,admin-2' }),
    });
    expect(res.status).toBe(403);
  });

  it('allows the request when caller uid is in ADMIN_UIDS', async () => {
    const db = createTestDb();
    seedSettings(db);
    const token = await signTestJwt('admin-1');
    const res = await testRequest('/admin/settings', {
      headers: { Authorization: `Bearer ${token}` },
      env: makeDbEnv(db, { ADMIN_UIDS: 'admin-1,admin-2' }),
    });
    expect(res.status).toBe(200);
  });

  it('trims whitespace in ADMIN_UIDS list', async () => {
    const db = createTestDb();
    seedSettings(db);
    const token = await signTestJwt('admin-1');
    const res = await testRequest('/admin/settings', {
      headers: { Authorization: `Bearer ${token}` },
      env: makeDbEnv(db, { ADMIN_UIDS: '  admin-1  ,  admin-2  ' }),
    });
    expect(res.status).toBe(200);
  });
});

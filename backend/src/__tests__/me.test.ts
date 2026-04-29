import { describe, it, expect, beforeAll } from 'vitest';
import { testRequest } from './helpers';
import { createTestDb, makeDbEnv, signTestJwt, installJwksMock } from './helpers/db';

beforeAll(() => installJwksMock());

describe('GET /admin/me', () => {
  it('returns 401 without an Authorization header', async () => {
    const db = createTestDb();
    const res = await testRequest('/admin/me', { env: makeDbEnv(db) });
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is malformed', async () => {
    const db = createTestDb();
    const res = await testRequest('/admin/me', {
      headers: { 'Cf-Access-Jwt-Assertion': 'not-a-jwt' },
      env: makeDbEnv(db),
    });
    expect(res.status).toBe(401);
  });

  it('returns the authenticated user with isAdmin=false when ADMIN_EMAILS unset', async () => {
    const db = createTestDb();
    const token = await signTestJwt('user1@test.com', { name: 'User One' });
    const res = await testRequest('/admin/me', {
      headers: { 'Cf-Access-Jwt-Assertion': token },
      env: makeDbEnv(db),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    // With Cloudflare Access, uid and email are the same (email is the stable identifier).
    expect(body.uid).toBe('user1@test.com');
    expect(body.email).toBe('user1@test.com');
    expect(body.name).toBe('User One');
    expect(body.isAdmin).toBe(false);
  });

  it('returns isAdmin=true when uid is in ADMIN_EMAILS', async () => {
    const db = createTestDb();
    const token = await signTestJwt('admin-uid');
    const res = await testRequest('/admin/me', {
      headers: { 'Cf-Access-Jwt-Assertion': token },
      env: makeDbEnv(db, { ADMIN_EMAILS: 'admin-uid,other-admin' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.isAdmin).toBe(true);
  });

  it('returns isAdmin=false when uid is not in ADMIN_EMAILS', async () => {
    const db = createTestDb();
    const token = await signTestJwt('not-admin');
    const res = await testRequest('/admin/me', {
      headers: { 'Cf-Access-Jwt-Assertion': token },
      env: makeDbEnv(db, { ADMIN_EMAILS: 'admin-uid' }),
    });
    const body = await res.json() as Record<string, any>;
    expect(body.isAdmin).toBe(false);
  });
});

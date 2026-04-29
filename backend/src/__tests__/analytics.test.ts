import { describe, it, expect, beforeAll } from 'vitest';
import { testRequest } from './helpers';
import { createTestDb, makeDbEnv, seedSettings, seedMenu, seedCategory, seedEntry, signTestJwt, installJwksMock } from './helpers/db';

beforeAll(() => installJwksMock());

const ADMIN_UID = 'admin-1';

async function adminEnv() {
  const db = createTestDb();
  seedSettings(db);
  seedMenu(db, 'menu-1');
  seedCategory(db, 'cat-1', 'menu-1');
  seedEntry(db, 'entry-1', 'cat-1', { name: 'A' });
  seedEntry(db, 'entry-2', 'cat-1', { name: 'B' });
  const env = makeDbEnv(db, { ADMIN_UIDS: ADMIN_UID });
  const token = await signTestJwt(ADMIN_UID);
  return { db, env, headers: { Authorization: `Bearer ${token}` } };
}

function todayBucket(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function insertView(db: ReturnType<typeof createTestDb>, entryId: string, sessionHash: string, viewedAt: number) {
  db.raw.prepare(
    `INSERT INTO catalog_views (id, entry_id, date_bucket, session_hash, viewed_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(crypto.randomUUID(), entryId, todayBucket(), sessionHash, viewedAt);
}

describe('GET /admin/analytics', () => {
  it('returns 401 without auth', async () => {
    const db = createTestDb();
    seedSettings(db);
    const res = await testRequest('/admin/analytics', { env: makeDbEnv(db) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const db = createTestDb();
    seedSettings(db);
    const token = await signTestJwt('not-admin');
    const res = await testRequest('/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` },
      env: makeDbEnv(db, { ADMIN_UIDS: 'someone-else' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns aggregated viewedItems for the period', async () => {
    const { db, env, headers } = await adminEnv();
    const now = Date.now();
    insertView(db, 'entry-1', 'sess-1', now);
    insertView(db, 'entry-1', 'sess-2', now);
    insertView(db, 'entry-2', 'sess-3', now);

    const res = await testRequest('/admin/analytics?period=24h', { headers, env });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.period).toBe('24h');
    expect(body.viewedItems).toHaveLength(2);
    expect(body.viewedItems[0].entryId).toBe('entry-1');
    expect(body.viewedItems[0].viewCount).toBe(2);
  });

  it('rejects unknown periods', async () => {
    const { env, headers } = await adminEnv();
    const res = await testRequest('/admin/analytics?period=junk', { headers, env });
    expect(res.status).toBe(400);
  });

  it('returns dailyTotals for 7d window', async () => {
    const { env, headers } = await adminEnv();
    const res = await testRequest('/admin/analytics?period=7d', { headers, env });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.dailyTotals).toBeDefined();
    expect(body.dailyTotals).toHaveLength(7);
  });
});

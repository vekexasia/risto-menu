import { describe, it, expect, beforeAll } from 'vitest';
import { testRequest } from './helpers';
import { createTestDb, makeDbEnv, seedSettings, seedMenu, seedCategory, seedEntry, signTestJwt, installJwksMock } from './helpers/db';

beforeAll(() => installJwksMock());

describe('GET /catalog', () => {
  it('returns 503 when DB is not configured', async () => {
    const res = await testRequest('/catalog');
    expect(res.status).toBe(503);
  });

  it('returns 404 when the menu is in draft state', async () => {
    const db = createTestDb();
    seedSettings(db, { publication_state: 'draft' });
    const res = await testRequest('/catalog', { env: makeDbEnv(db) });
    expect(res.status).toBe(404);
  });

  it('returns the catalog when published', async () => {
    const db = createTestDb();
    seedSettings(db, { name: 'Trattoria Test', publication_state: 'published' });
    seedMenu(db, 'menu-1', 'seated');
    seedCategory(db, 'cat-1', 'menu-1', 'Antipasti');
    seedEntry(db, 'entry-1', 'cat-1', { name: 'Bruschetta', price: 850 });
    const res = await testRequest('/catalog', { env: makeDbEnv(db) });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.restaurant.name).toBe('Trattoria Test');
    expect(body.menus).toHaveLength(1);
    expect(body.menus[0].categories).toHaveLength(1);
    expect(body.menus[0].categories[0].entries[0].name).toBe('Bruschetta');
    expect(body.menus[0].categories[0].entries[0].price).toBeCloseTo(8.5);
  });

  it('hides hidden entries from public catalog', async () => {
    const db = createTestDb();
    seedSettings(db);
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'visible', 'cat-1', { name: 'Visible' });
    seedEntry(db, 'hidden', 'cat-1', { name: 'Hidden', visibility: 'hidden' });
    const res = await testRequest('/catalog', { env: makeDbEnv(db) });
    const body = await res.json() as Record<string, any>;
    const names = body.menus[0].categories[0].entries.map((e: any) => e.name);
    expect(names).toEqual(['Visible']);
  });
});

describe('POST /catalog/view', () => {
  it('records a view for a real entry', async () => {
    const db = createTestDb();
    seedSettings(db);
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');
    const res = await testRequest('/catalog/view', {
      method: 'POST',
      body: { entryId: 'entry-1' },
      env: makeDbEnv(db),
    });
    expect(res.status).toBe(200);
    const count = db.raw.prepare('SELECT COUNT(*) AS n FROM catalog_views').get() as { n: number };
    expect(count.n).toBe(1);
  });

  it('silently drops views for unknown entries (no row inserted)', async () => {
    const db = createTestDb();
    seedSettings(db);
    const res = await testRequest('/catalog/view', {
      method: 'POST',
      body: { entryId: 'does-not-exist' },
      env: makeDbEnv(db),
    });
    expect(res.status).toBe(200);
    const count = db.raw.prepare('SELECT COUNT(*) AS n FROM catalog_views').get() as { n: number };
    expect(count.n).toBe(0);
  });

  it('deduplicates same session/day/entry via UNIQUE constraint', async () => {
    const db = createTestDb();
    seedSettings(db);
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');
    const env = makeDbEnv(db);
    const send = () => testRequest('/catalog/view', {
      method: 'POST',
      body: { entryId: 'entry-1' },
      headers: { 'cf-connecting-ip': '1.2.3.4' },
      env,
    });
    await send();
    await send();
    await send();
    const count = db.raw.prepare('SELECT COUNT(*) AS n FROM catalog_views').get() as { n: number };
    expect(count.n).toBe(1);
  });

  it('different IPs produce different rows on the same day', async () => {
    const db = createTestDb();
    seedSettings(db);
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');
    const env = makeDbEnv(db);
    await testRequest('/catalog/view', {
      method: 'POST', body: { entryId: 'entry-1' },
      headers: { 'cf-connecting-ip': '1.1.1.1' }, env,
    });
    await testRequest('/catalog/view', {
      method: 'POST', body: { entryId: 'entry-1' },
      headers: { 'cf-connecting-ip': '2.2.2.2' }, env,
    });
    const count = db.raw.prepare('SELECT COUNT(*) AS n FROM catalog_views').get() as { n: number };
    expect(count.n).toBe(2);
  });
});

describe('POST /catalog/publish', () => {
  it('returns 401 without auth', async () => {
    const db = createTestDb();
    seedSettings(db);
    const res = await testRequest('/catalog/publish', {
      method: 'POST',
      env: makeDbEnv(db),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const db = createTestDb();
    seedSettings(db);
    const token = await signTestJwt('not-admin');
    const res = await testRequest('/catalog/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      env: makeDbEnv(db, { ADMIN_UIDS: 'admin-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('regenerates artifacts for an admin', async () => {
    const db = createTestDb();
    seedSettings(db);
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');
    const token = await signTestJwt('admin-1');
    const res = await testRequest('/catalog/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      env: makeDbEnv(db, { ADMIN_UIDS: 'admin-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, any>;
    expect(body.ok).toBe(true);
  });
});

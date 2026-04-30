import { describe, it, expect, beforeAll } from 'vitest';
import { testRequest } from './helpers';
import { createTestDb, makeDbEnv, seedSettings, seedMenu, seedCategory, seedEntry, signTestJwt, installJwksMock } from './helpers/db';

beforeAll(() => installJwksMock());

const ADMIN_UID = 'admin-1';
type SettingsRow = { name: string; payoff: string; ai_chat_enabled: number };
type PublicationRow = { publication_state: string };
type CategoryRow = { name: string };
type EntryRow = { name: string; price: number; visibility: string; out_of_stock: number; category_id: string };


async function adminEnv(db = createTestDb()) {
  seedSettings(db);
  const env = makeDbEnv(db, { ADMIN_EMAILS: ADMIN_UID });
  const token = await signTestJwt(ADMIN_UID);
  return {
    db,
    env,
    headers: { 'Cf-Access-Jwt-Assertion': token },
  };
}

describe('GET /admin/settings', () => {
  it('returns settings for an admin', async () => {
    const { env, headers } = await adminEnv();
    const res = await testRequest('/admin/settings', { headers, env });
    expect(res.status).toBe(200);
    const body = await res.json() as { publicationState: string; aiChatEnabled: boolean };
    expect(body).toHaveProperty('publicationState');
    expect(body).toHaveProperty('aiChatEnabled');
  });
});

describe('PUT /admin/settings', () => {
  it('updates settings fields and persists them', async () => {
    const { db, env, headers } = await adminEnv();
    const res = await testRequest('/admin/settings', {
      method: 'PUT',
      headers,
      env,
      body: { name: 'Trattoria Nuova', payoff: 'Il sapore di casa', aiChatEnabled: true },
    });
    expect(res.status).toBe(200);
    const row = db.raw.prepare('SELECT name, payoff, ai_chat_enabled FROM settings WHERE id = 1').get() as SettingsRow;
    expect(row.name).toBe('Trattoria Nuova');
    expect(row.payoff).toBe('Il sapore di casa');
    expect(row.ai_chat_enabled).toBe(1);
  });
});

describe('PUT /admin/publication', () => {
  it('toggles publication state', async () => {
    const { db, env, headers } = await adminEnv();
    let res = await testRequest('/admin/publication', {
      method: 'PUT', headers, env, body: { published: true },
    });
    expect(res.status).toBe(200);
    let row = db.raw.prepare('SELECT publication_state FROM settings WHERE id = 1').get() as PublicationRow;
    expect(row.publication_state).toBe('published');

    res = await testRequest('/admin/publication', {
      method: 'PUT', headers, env, body: { published: false },
    });
    expect(res.status).toBe(200);
    row = db.raw.prepare('SELECT publication_state FROM settings WHERE id = 1').get() as PublicationRow;
    expect(row.publication_state).toBe('draft');
  });
});

describe('PUT /admin/categories/:id', () => {
  it('updates a category name', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1', 'Old Name');
    const res = await testRequest('/admin/categories/cat-1', {
      method: 'PUT', headers, env, body: { name: 'New Name' },
    });
    expect(res.status).toBe(200);
    const row = db.raw.prepare('SELECT name FROM menu_categories WHERE id = ?').get('cat-1') as CategoryRow;
    expect(row.name).toBe('New Name');
  });
});

describe('DELETE /admin/categories/:id', () => {
  it('cascades to entries and catalog views', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');
    db.raw.prepare(
      `INSERT INTO catalog_views (id, entry_id, date_bucket, session_hash, viewed_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('view-1', 'entry-1', 20260429, 'hash', Date.now());

    const res = await testRequest('/admin/categories/cat-1', { method: 'DELETE', headers, env });
    expect(res.status).toBe(200);

    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM menu_categories').get()).toEqual({ n: 0 });
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM menu_entries').get()).toEqual({ n: 0 });
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM catalog_views').get()).toEqual({ n: 0 });
  });
});

describe('PATCH /admin/categories/reorder', () => {
  it('updates sort_order on each provided id', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1', 'A', 0);
    seedCategory(db, 'cat-2', 'menu-1', 'B', 1);
    seedCategory(db, 'cat-3', 'menu-1', 'C', 2);

    const res = await testRequest('/admin/categories/reorder', {
      method: 'PATCH', headers, env,
      body: { items: [{ id: 'cat-3', order: 0 }, { id: 'cat-1', order: 1 }, { id: 'cat-2', order: 2 }] },
    });
    expect(res.status).toBe(200);

    const orders = db.raw.prepare('SELECT id, sort_order FROM menu_categories ORDER BY sort_order').all();
    expect(orders).toEqual([
      { id: 'cat-3', sort_order: 0 },
      { id: 'cat-1', sort_order: 1 },
      { id: 'cat-2', sort_order: 2 },
    ]);
  });
});

describe('POST /admin/categories/:id/entries', () => {
  it('creates an entry under the category and converts price to cents', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');

    const res = await testRequest('/admin/categories/cat-1/entries', {
      method: 'POST', headers, env,
      body: { name: 'Pizza Margherita', price: 9.5, menuVisibility: ['all'] },
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(body.id).toBeDefined();

    const row = db.raw.prepare('SELECT name, price, visibility FROM menu_entries WHERE id = ?').get(body.id) as Pick<EntryRow, 'name' | 'price' | 'visibility'>;
    expect(row.name).toBe('Pizza Margherita');
    expect(row.price).toBe(950);
    expect(row.visibility).toBe('all');
  });

  it('returns 404 if the category does not exist', async () => {
    const { env, headers } = await adminEnv();
    const res = await testRequest('/admin/categories/nope/entries', {
      method: 'POST', headers, env,
      body: { name: 'X', price: 1, menuVisibility: ['all'] },
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /admin/entries/:id', () => {
  it('updates the named fields', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1', { name: 'Old', price: 500 });

    const res = await testRequest('/admin/entries/entry-1', {
      method: 'PUT', headers, env,
      body: { name: 'New', price: 12.34, outOfStock: true },
    });
    expect(res.status).toBe(200);

    const row = db.raw.prepare('SELECT name, price, out_of_stock FROM menu_entries WHERE id = ?').get('entry-1') as Pick<EntryRow, 'name' | 'price' | 'out_of_stock'>;
    expect(row.name).toBe('New');
    expect(row.price).toBe(1234);
    expect(row.out_of_stock).toBe(1);
  });
});

describe('DELETE /admin/entries/:id', () => {
  it('removes the entry', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');
    const res = await testRequest('/admin/entries/entry-1', { method: 'DELETE', headers, env });
    expect(res.status).toBe(200);
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM menu_entries').get()).toEqual({ n: 0 });
  });
});

describe('POST /admin/entries/:id/move', () => {
  it('moves an entry to a new category', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedCategory(db, 'cat-2', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');

    const res = await testRequest('/admin/entries/entry-1/move', {
      method: 'POST', headers, env,
      body: { targetCategoryId: 'cat-2' },
    });
    expect(res.status).toBe(200);

    const row = db.raw.prepare('SELECT category_id FROM menu_entries WHERE id = ?').get('entry-1') as Pick<EntryRow, 'category_id'>;
    expect(row.category_id).toBe('cat-2');
  });

  it('returns 404 if target category does not exist', async () => {
    const { db, env, headers } = await adminEnv();
    seedMenu(db, 'menu-1');
    seedCategory(db, 'cat-1', 'menu-1');
    seedEntry(db, 'entry-1', 'cat-1');

    const res = await testRequest('/admin/entries/entry-1/move', {
      method: 'POST', headers, env,
      body: { targetCategoryId: 'no-such-cat' },
    });
    expect(res.status).toBe(404);
  });
});

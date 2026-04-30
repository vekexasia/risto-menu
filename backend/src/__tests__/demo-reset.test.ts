import { describe, it, expect } from 'vitest';
import { testRequest } from './helpers';
import { createTestDb, makeDbEnv, seedSettings, seedMenu, seedCategory, seedEntry } from './helpers/db';
import { resetDemoData } from '../lib/demo-reset';

describe('demo reset', () => {
  it('replaces mutable data with the demo fixture', async () => {
    const db = createTestDb();
    seedSettings(db, { name: 'Changed by visitor', publication_state: 'draft' });
    seedMenu(db, 'visitor-menu');
    seedCategory(db, 'visitor-cat', 'visitor-menu');
    seedEntry(db, 'visitor-entry', 'visitor-cat', { name: 'Visitor item' });

    await resetDemoData(makeDbEnv(db, { DEMO_MODE: 'true' }));

    const settings = db.raw.prepare('SELECT name, publication_state FROM settings WHERE id = 1').get();
    const visitorEntry = db.raw.prepare('SELECT id FROM menu_entries WHERE id = ?').get('visitor-entry');
    const demoEntry = db.raw.prepare('SELECT name FROM menu_entries WHERE id = ?').get('demo-entry-ravioli');

    expect(settings).toEqual({ name: 'Trattoria Demo', publication_state: 'published' });
    expect(visitorEntry).toBeUndefined();
    expect(demoEntry).toEqual({ name: 'Ricotta and spinach ravioli' });
  });

  it('exposes a demo-only reset endpoint', async () => {
    const db = createTestDb();
    seedSettings(db);

    const prodRes = await testRequest('/admin/demo/reset', {
      method: 'POST',
      env: makeDbEnv(db, { DEMO_MODE: 'false', ADMIN_EMAILS: 'admin' }),
    });
    expect(prodRes.status).toBe(401);

    const demoRes = await testRequest('/admin/demo/reset', {
      method: 'POST',
      env: makeDbEnv(db, { DEMO_MODE: 'true' }),
    });
    expect(demoRes.status).toBe(200);
  });
});

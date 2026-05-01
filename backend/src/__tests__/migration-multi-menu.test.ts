import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Verify the 0001_multi_menu migration's data backfill on a synthetic dataset.
 * Seeds the schema at 0000_initial state, inserts entries with each legacy
 * `visibility` variant, applies 0001_multi_menu, and asserts the resulting
 * memberships, hidden flags, menus.sort_order, and openingSchedule shape.
 */

function applyMigration(db: Database.Database, file: string): void {
  const sql = readFileSync(resolve(__dirname, '../../drizzle', file), 'utf8');
  for (const stmt of sql.split('--> statement-breakpoint')) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    db.exec(trimmed);
  }
}

describe('0001_multi_menu migration', () => {
  it('seeds memberships from legacy visibility, sets hidden flag, collapses opening_schedule', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    applyMigration(db, '0000_initial.sql');

    const now = Date.now();
    db.exec(`
      INSERT INTO menus (id, code, title, created_at, updated_at) VALUES
        ('m-seated',   'seated',   'Table',  ${now}, ${now}),
        ('m-takeaway', 'takeaway', 'Drinks', ${now}, ${now});
      INSERT INTO menu_categories (id, menu_id, name, sort_order, created_at, updated_at) VALUES
        ('c-pasta', 'm-seated',   'Pasta', 0, ${now}, ${now}),
        ('c-wine',  'm-takeaway', 'Wine',  0, ${now}, ${now});
      INSERT INTO menu_entries (id, category_id, name, price, sort_order, visibility, created_at, updated_at) VALUES
        ('e-carbonara', 'c-pasta', 'Carbonara',     1200, 0, 'seated',   ${now}, ${now}),
        ('e-special',   'c-pasta', 'Special Soup',  800,  1, 'all',      ${now}, ${now}),
        ('e-merlot',    'c-wine',  'Merlot',        600,  0, 'takeaway', ${now}, ${now}),
        ('e-archived',  'c-pasta', 'Archived Dish', 1000, 2, 'hidden',   ${now}, ${now});
    `);
    db.prepare(`UPDATE settings SET opening_schedule = ? WHERE id = 1`).run(
      JSON.stringify({
        seated:   { open: true,  minWaitSlot: 15, slotDuration: 30, maxDaysLookAhead: 7, schedule: [[],[],[],[],[],[],[]] },
        takeaway: { open: false, minWaitSlot: 0,  slotDuration: 0,  maxDaysLookAhead: 0, schedule: [[],[],[],[],[],[],[]] },
      }),
    );

    applyMigration(db, '0001_multi_menu.sql');

    // ── Membership backfill ──
    const memberships = db
      .prepare('SELECT entry_id, menu_id FROM menu_entry_memberships ORDER BY entry_id, menu_id')
      .all();
    expect(memberships).toEqual([
      { entry_id: 'e-carbonara', menu_id: 'm-seated' },
      { entry_id: 'e-merlot',    menu_id: 'm-takeaway' },
      { entry_id: 'e-special',   menu_id: 'm-seated' },
      { entry_id: 'e-special',   menu_id: 'm-takeaway' },
    ]);

    // ── Hidden flag ──
    const entries = db.prepare('SELECT id, hidden FROM menu_entries ORDER BY id').all();
    expect(entries).toEqual([
      { id: 'e-archived',  hidden: 1 },
      { id: 'e-carbonara', hidden: 0 },
      { id: 'e-merlot',    hidden: 0 },
      { id: 'e-special',   hidden: 0 },
    ]);

    // ── Menu sort order: seated=0, takeaway=1 ──
    const menus = db.prepare('SELECT code, sort_order, published FROM menus ORDER BY sort_order').all();
    expect(menus).toEqual([
      { code: 'seated',   sort_order: 0, published: 1 },
      { code: 'takeaway', sort_order: 1, published: 1 },
    ]);

    // ── opening_schedule collapsed to seated WorkingHours ──
    const settingsRow = db.prepare('SELECT opening_schedule FROM settings WHERE id = 1').get() as { opening_schedule: string };
    const schedule = JSON.parse(settingsRow.opening_schedule);
    expect(schedule.open).toBe(true);
    expect(schedule.minWaitSlot).toBe(15);
    expect(schedule.seated).toBeUndefined();
    expect(schedule.takeaway).toBeUndefined();

    // ── visibility column dropped ──
    const cols = db.prepare("PRAGMA table_info(menu_entries)").all() as Array<{ name: string }>;
    expect(cols.map((c) => c.name)).not.toContain('visibility');
    expect(cols.map((c) => c.name)).toContain('hidden');

    // ── menu_categories.menu_id dropped ──
    const catCols = db.prepare("PRAGMA table_info(menu_categories)").all() as Array<{ name: string }>;
    expect(catCols.map((c) => c.name)).not.toContain('menu_id');
  });

  it('falls back to takeaway opening_schedule when seated is absent', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    applyMigration(db, '0000_initial.sql');
    db.prepare(`UPDATE settings SET opening_schedule = ? WHERE id = 1`).run(
      JSON.stringify({
        takeaway: { open: false, minWaitSlot: 5, slotDuration: 10, maxDaysLookAhead: 3, schedule: [[],[],[],[],[],[],[]] },
      }),
    );
    applyMigration(db, '0001_multi_menu.sql');
    const settingsRow = db.prepare('SELECT opening_schedule FROM settings WHERE id = 1').get() as { opening_schedule: string };
    const schedule = JSON.parse(settingsRow.opening_schedule);
    expect(schedule.open).toBe(false);
    expect(schedule.minWaitSlot).toBe(5);
  });

  it('leaves opening_schedule untouched when settings has neither seated nor takeaway shape', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    applyMigration(db, '0000_initial.sql');
    // Already-flat shape (forward-compat)
    db.prepare(`UPDATE settings SET opening_schedule = ? WHERE id = 1`).run(
      JSON.stringify({ open: true, minWaitSlot: 1, slotDuration: 1, maxDaysLookAhead: 1, schedule: [[],[],[],[],[],[],[]] }),
    );
    applyMigration(db, '0001_multi_menu.sql');
    const settingsRow = db.prepare('SELECT opening_schedule FROM settings WHERE id = 1').get() as { opening_schedule: string };
    const schedule = JSON.parse(settingsRow.opening_schedule);
    expect(schedule.open).toBe(true);
    expect(schedule.minWaitSlot).toBe(1);
  });
});

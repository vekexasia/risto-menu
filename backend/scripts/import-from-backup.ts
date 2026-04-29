#!/usr/bin/env tsx
/**
 * Legacy backup JSON → Cloudflare D1 import
 *
 * Reads a local restaurant backup JSON and applies it to D1 (remote by default,
 * local with --local). This script does not connect to Firebase.
 *
 * Usage:
 *   npx tsx scripts/import-from-backup.ts --file <path-to-backup.json>
 *   npx tsx scripts/import-from-backup.ts --file <path> --dry-run
 *   npx tsx scripts/import-from-backup.ts --file <path> --local
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LOCAL = args.includes('--local');
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

if (!fileArg) {
  console.error('Usage: npx tsx scripts/import-from-backup.ts --file <backup.json> [--dry-run] [--local]');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);
if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const DB_NAME = 'risto-db';
const SQL_TMP = path.resolve(process.cwd(), 'tmp-backup-import.sql');

// ── SQL helpers ───────────────────────────────────────────────────────

function esc(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

function lit(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'string') return esc(v);
  return esc(JSON.stringify(v));
}

function eurosToCents(euros: unknown): number {
  const n = typeof euros === 'number' ? euros : parseFloat(String(euros) || '0');
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mapVisibility(v: unknown): string {
  if (!v || (Array.isArray(v) && v.length === 0)) return 'hidden';
  if (Array.isArray(v)) {
    if (v.includes('all')) return 'all';
    if (v.includes('seated') && v.includes('takeaway')) return 'all';
    if (v.includes('seated')) return 'seated';
    if (v.includes('takeaway')) return 'takeaway';
  }
  return 'all';
}

// ── Backup types ──────────────────────────────────────────────────────

interface DocRef { _type: 'document-reference'; path: string }
interface BackupDoc { id: string; path: string; data: Record<string, unknown>; collections?: Record<string, BackupDoc[]> }
interface BackupFile { version: number; exportedAt: string; restaurantId: string; root: BackupDoc }

// ── Main ──────────────────────────────────────────────────────────────

const backup = JSON.parse(readFileSync(filePath, 'utf-8')) as BackupFile;
const { restaurantId, root } = backup;
const rdata = root.data;
const now = Date.now();

console.log(`\n📦 Importing backup for: ${restaurantId}`);
console.log(`   Exported: ${backup.exportedAt}`);

const statements: string[] = [`-- Import from backup: ${filePath}`];
const counts: Record<string, number> = {};

function emit(sql: string) { statements.push(sql.trim()); }
function count(entity: string) { counts[entity] = (counts[entity] || 0) + 1; }

// ── Restaurant ────────────────────────────────────────────────────────
emit(`INSERT OR REPLACE INTO restaurants
  (id, slug, name, payoff, owner_user_id, theme, info, socials, opening_schedule,
   chat_agent_prompt, promotion_alert, publication_state,
   subscription_status, stripe_customer_id, trial_ends_at, created_at, updated_at)
VALUES (
  ${lit(restaurantId)}, ${lit(slugify(restaurantId))},
  ${lit(rdata.name ?? restaurantId)}, ${lit(rdata.payoff ?? null)},
  ${lit(rdata.ownerID ?? null)}, ${lit(rdata.theme ?? null)},
  ${lit(rdata.info ?? null)}, ${lit(rdata.socials ?? null)},
  ${lit(rdata.openingSchedule ?? null)}, ${lit(rdata.chatAgentPrompt ?? null)},
  ${lit(rdata.promotionAlert ?? null)},
  'published', 'trial', NULL, NULL, ${now}, ${now}
);`);
count('restaurants');

// Owner membership (if ownerID known)
if (rdata.ownerID) {
  emit(`INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
VALUES (${lit(rdata.ownerID)}, NULL, NULL, ${now}, ${now});`);

  emit(`INSERT INTO restaurant_memberships (restaurant_id, user_id, role, created_at, updated_at)
VALUES (${lit(restaurantId)}, ${lit(rdata.ownerID)}, 'owner', ${now}, ${now})
ON CONFLICT (restaurant_id, user_id) DO UPDATE SET role = 'owner', updated_at = ${now};`);
  count('memberships');
}

// ── Menus ─────────────────────────────────────────────────────────────
const menusData = rdata.menus as Record<string, Record<string, unknown>> | null;
const seatedMenu = menusData?.seated;
const takeawayMenu = menusData?.takeaway;

const seatedMenuId = `${restaurantId}-seated`;
const takeawayMenuId = `${restaurantId}-takeaway`;

emit(`INSERT OR REPLACE INTO menus (id, restaurant_id, code, title, can_order, i18n, created_at, updated_at)
VALUES (${lit(seatedMenuId)}, ${lit(restaurantId)}, 'seated',
  ${lit(seatedMenu?.name ?? 'Menu')}, 0, ${lit(seatedMenu?.i18n ?? null)}, ${now}, ${now});`);
count('menus');

emit(`INSERT OR REPLACE INTO menus (id, restaurant_id, code, title, can_order, i18n, created_at, updated_at)
VALUES (${lit(takeawayMenuId)}, ${lit(restaurantId)}, 'takeaway',
  ${lit(takeawayMenu?.name ?? 'Drinks')}, 0, ${lit(takeawayMenu?.i18n ?? null)}, ${now}, ${now});`);
count('menus');

// ── Categories + Entries ──────────────────────────────────────────────
const categories = (root.collections?.['menuEntries'] ?? []) as BackupDoc[];

for (const cat of categories) {
  const cd = cat.data;

  emit(`INSERT OR REPLACE INTO menu_categories (id, restaurant_id, menu_id, name, sort_order, i18n, created_at, updated_at)
VALUES (${lit(cat.id)}, ${lit(restaurantId)}, ${lit(seatedMenuId)},
  ${lit(cd.name ?? cat.id)}, ${Number(cd.order ?? 0)}, ${lit(cd.i18n ?? null)}, ${now}, ${now});`);
  count('categories');

  const entries = (cat.collections?.['entries'] ?? []) as BackupDoc[];

  for (const entry of entries) {
    const e = entry.data;
    const priceCents = eurosToCents(e.price);

    const metadata: Record<string, unknown> = {};
    if (e.internalCode) metadata.internalCode = e.internalCode;
    if (e.variants && (e.variants as unknown[]).length > 0) {
      metadata.variantRefs = (e.variants as DocRef[]).map(r => r.path?.split('/').pop());
    }
    if (e.extras && (e.extras as unknown[]).length > 0) {
      metadata.extraRefs = (e.extras as DocRef[]).map(r => r.path?.split('/').pop());
    }

    emit(`INSERT OR REPLACE INTO menu_entries
  (id, restaurant_id, category_id, name, description, price, price_unit, image_url,
   out_of_stock, frozen, sort_order, visibility, allergens, i18n, metadata, created_at, updated_at)
VALUES (
  ${lit(entry.id)}, ${lit(restaurantId)}, ${lit(cat.id)}, ${lit(e.name ?? 'Unnamed')},
  ${lit(e.desc ?? null)}, ${priceCents}, ${lit(e.priceUnit ?? null)}, ${lit(e.image ?? null)},
  ${e.outOfStock ? 1 : 0}, ${e.frozen ? 1 : 0}, ${Number(e.order ?? 0)},
  ${lit(mapVisibility(e.menuVisibility))},
  ${lit((e.allergens as string[] | null) ?? null)},
  ${lit(e.i18n ?? null)},
  ${lit(Object.keys(metadata).length > 0 ? metadata : null)},
  ${now}, ${now}
);`);
    count('entries');
  }
}

// ── Variants ──────────────────────────────────────────────────────────
const variants = (root.collections?.['variants'] ?? []) as BackupDoc[];

for (const v of variants) {
  const vd = v.data;
  const selections = ((vd.selections as Record<string, unknown>[]) || []).map((s) => ({
    name: s.name,
    price: eurosToCents(s.priceDiff ?? s.price ?? 0),
    isDefault: s.isDefault ?? false,
    i18n: s.i18n ?? null,
  }));

  emit(`INSERT OR REPLACE INTO menu_variants (id, restaurant_id, name, description, sort_order, selections, i18n, created_at, updated_at)
VALUES (${lit(v.id)}, ${lit(restaurantId)}, ${lit(vd.name ?? 'Unnamed')},
  ${lit(vd.desc ?? null)}, ${Number(vd.order ?? 0)},
  ${lit(selections.length > 0 ? selections : null)}, ${lit(vd.i18n ?? null)}, ${now}, ${now});`);
  count('variants');
}

// ── Extras ────────────────────────────────────────────────────────────
const extras = (root.collections?.['extras'] ?? []) as BackupDoc[];

for (const ex of extras) {
  const exd = ex.data;
  const options = ((exd.extras as Record<string, unknown>[]) || []).map((o) => ({
    name: o.name,
    internalCode: o.internalCode ?? null,
    desc: o.desc ?? null,
    price: eurosToCents(o.price ?? 0),
    i18n: o.i18n ?? null,
  }));

  emit(`INSERT OR REPLACE INTO menu_extras (id, restaurant_id, name, type, max, options, i18n, created_at, updated_at)
VALUES (${lit(ex.id)}, ${lit(restaurantId)}, ${lit(exd.name ?? 'Unnamed')},
  ${lit(exd.type ?? 'zeroorone')}, ${Number(exd.max ?? 1)},
  ${lit(options.length > 0 ? options : null)}, ${lit(exd.i18n ?? null)}, ${now}, ${now});`);
  count('extras');
}

// ── Summary ───────────────────────────────────────────────────────────
console.log('\n📊 Objects to import:');
for (const [entity, n] of Object.entries(counts)) {
  console.log(`   ${entity}: ${n}`);
}
console.log(`   Total SQL statements: ${statements.length}`);

if (DRY_RUN) {
  console.log('\n🔍 Dry run — first 20 statements:');
  statements.slice(0, 20).forEach((s, i) => console.log(`[${i + 1}] ${s.slice(0, 120)}`));
  console.log('\n✅ Dry run complete — no changes made.');
  process.exit(0);
}

// ── Apply ─────────────────────────────────────────────────────────────
const sql = statements.join('\n') + '\n';
writeFileSync(SQL_TMP, sql, 'utf-8');

const target = LOCAL ? '--local' : '--remote';
console.log(`\n🚀 Applying to D1 (${LOCAL ? 'local' : 'remote'})...`);

try {
  execSync(`npx wrangler d1 execute ${DB_NAME} ${target} --file=${SQL_TMP}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('\n✅ Import complete!');
} finally {
  if (existsSync(SQL_TMP)) unlinkSync(SQL_TMP);
}

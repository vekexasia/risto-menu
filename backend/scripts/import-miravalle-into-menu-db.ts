#!/usr/bin/env tsx
/**
 * One-off cutover script: extracts Miravalle's rows from the old multi-tenant
 * SQL dump and writes them into the new single-tenant `menu-db` schema.
 *
 * Differences vs. the old schema:
 *   - The `restaurants` row becomes the singleton `settings` row (id = 1).
 *   - All child rows drop their `restaurant_id` column.
 *   - `users`, `restaurant_memberships`, `restaurant_domains` tables are gone.
 *
 * Usage:
 *   npx tsx scripts/import-miravalle-into-menu-db.ts \
 *     --dump backups/risto-db-full-2026-04-29.sql \
 *     --slug miravalle-jesolo
 *
 * Add --remote to apply to remote D1, --local for the dev DB.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const REMOTE = args.includes('--remote');
const LOCAL = args.includes('--local');
const DRY_RUN = args.includes('--dry-run');

function pickArg(name: string): string | null {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : null;
}

const DUMP = pickArg('--dump');
const SLUG = pickArg('--slug');

if (!DUMP || !SLUG) {
  console.error('Usage: --dump <path-to-dump.sql> --slug <restaurant-id> [--remote|--local] [--dry-run]');
  process.exit(1);
}

const dumpPath = path.resolve(process.cwd(), DUMP);
if (!existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

const sql = readFileSync(dumpPath, 'utf8');

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseInsertRow(line: string): string[] | null {
  // Match: INSERT INTO "<table>" (...cols...) VALUES (...vals...);
  const m = line.match(/^INSERT INTO "([^"]+)"\s*\(([^)]*)\)\s*VALUES\s*\(([\s\S]*)\)\s*;\s*$/);
  if (!m) return null;
  const [, , , valuesPart] = m;

  // Tokenize the values list, respecting single-quoted strings with '' escapes.
  const tokens: string[] = [];
  let buf = '';
  let inStr = false;
  for (let i = 0; i < valuesPart.length; i++) {
    const ch = valuesPart[i];
    if (inStr) {
      if (ch === "'" && valuesPart[i + 1] === "'") {
        buf += "''";
        i++;
        continue;
      }
      buf += ch;
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      buf += ch;
      continue;
    }
    if (ch === ',') {
      tokens.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length > 0) tokens.push(buf.trim());
  return tokens;
}

function parseInsertCols(line: string): { table: string; cols: string[] } | null {
  const m = line.match(/^INSERT INTO "([^"]+)"\s*\(([^)]*)\)/);
  if (!m) return null;
  const [, table, colsPart] = m;
  const cols = colsPart.split(',').map((c) => c.trim().replace(/"/g, ''));
  return { table, cols };
}

function rowFor(line: string): { table: string; row: Record<string, string> } | null {
  const head = parseInsertCols(line);
  const vals = parseInsertRow(line);
  if (!head || !vals) return null;
  if (head.cols.length !== vals.length) return null;
  const row: Record<string, string> = {};
  for (let i = 0; i < head.cols.length; i++) row[head.cols[i]] = vals[i];
  return { table: head.table, row };
}

// ── Walk the dump and bucket rows by table for the chosen slug ──────────────

const lines = sql.split('\n');

const restaurants: Record<string, string>[] = [];
const menus: Record<string, string>[] = [];
const menuCategories: Record<string, string>[] = [];
const menuEntries: Record<string, string>[] = [];
const menuVariants: Record<string, string>[] = [];
const menuExtras: Record<string, string>[] = [];

for (const raw of lines) {
  const line = raw.trim();
  if (!line.startsWith('INSERT INTO ')) continue;
  const parsed = rowFor(line);
  if (!parsed) continue;
  const { table, row } = parsed;
  const ridLit = `'${SLUG}'`;
  switch (table) {
    case 'restaurants':
      if (row.id === ridLit) restaurants.push(row);
      break;
    case 'menus':
      if (row.restaurant_id === ridLit) menus.push(row);
      break;
    case 'menu_categories':
      if (row.restaurant_id === ridLit) menuCategories.push(row);
      break;
    case 'menu_entries':
      if (row.restaurant_id === ridLit) menuEntries.push(row);
      break;
    case 'menu_variants':
      if (row.restaurant_id === ridLit) menuVariants.push(row);
      break;
    case 'menu_extras':
      if (row.restaurant_id === ridLit) menuExtras.push(row);
      break;
  }
}

if (restaurants.length === 0) {
  console.error(`No restaurants row found for slug "${SLUG}" in the dump.`);
  process.exit(1);
}
if (restaurants.length > 1) {
  console.error(`Multiple restaurants rows for slug "${SLUG}" — abort.`);
  process.exit(1);
}

const restaurant = restaurants[0];

console.log(`Found ${SLUG}:`);
console.log(`  menus:       ${menus.length}`);
console.log(`  categories:  ${menuCategories.length}`);
console.log(`  entries:     ${menuEntries.length}`);
console.log(`  variants:    ${menuVariants.length}`);
console.log(`  extras:      ${menuExtras.length}`);

// ── Build the SQL for the new schema ────────────────────────────────────────

const out: string[] = [];

// 1. Update the singleton settings row (id = 1) from the restaurants row.
//    We use UPDATE because the migration already inserted a default settings row.
const settingsCols = [
  'name', 'payoff', 'theme', 'info', 'socials', 'opening_schedule',
  'promotion_alert', 'chat_agent_prompt', 'ai_chat_enabled',
  'enabled_locales', 'disabled_locales', 'custom_locales',
  'publication_state', 'created_at', 'updated_at',
];
const setClauses = settingsCols
  .filter((c) => restaurant[c] !== undefined && restaurant[c] !== 'NULL')
  .map((c) => `${c} = ${restaurant[c]}`);
out.push(`UPDATE settings SET ${setClauses.join(', ')} WHERE id = 1;`);

// 2. Re-insert child tables, dropping restaurant_id.
function reinsert(table: string, rows: Record<string, string>[]) {
  for (const row of rows) {
    const cols = Object.keys(row).filter((c) => c !== 'restaurant_id');
    const vals = cols.map((c) => row[c]);
    out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
  }
}

reinsert('menus', menus);
reinsert('menu_categories', menuCategories);
reinsert('menu_entries', menuEntries);
reinsert('menu_variants', menuVariants);
reinsert('menu_extras', menuExtras);

// ── Write to a temp file and apply via wrangler d1 execute ──────────────────

const tmpFile = path.resolve(process.cwd(), 'tmp-cutover-import.sql');
writeFileSync(tmpFile, out.join('\n') + '\n');
console.log(`Wrote ${out.length} statements to ${tmpFile}`);

if (DRY_RUN) {
  console.log('Dry run — leaving tmp file for inspection. Not executing.');
  process.exit(0);
}

const flag = REMOTE ? '--remote' : LOCAL ? '--local' : '--remote';
const cmd = `npx wrangler d1 execute menu-db ${flag} --file=${tmpFile}`;
console.log(`Running: ${cmd}`);

try {
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
  console.log('Import complete.');
} finally {
  unlinkSync(tmpFile);
}

#!/usr/bin/env tsx
/**
 * Remote D1 → Local D1 Seed Script
 *
 * Pulls a restaurant's data from the remote D1 database and seeds it into
 * the local dev D1. Useful when you need real data to work with locally.
 *
 * Usage:
 *   npm run seed:local -- --restaurant <slug>
 *   npm run seed:local -- --restaurant <slug> --dry-run
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const restaurantId = args.includes('--restaurant')
  ? args[args.indexOf('--restaurant') + 1]
  : null;

if (!restaurantId) {
  console.error('Usage: tsx scripts/seed-local.ts --restaurant <id>');
  process.exit(1);
}

const DB_NAME = 'risto-db';
const SQL_TMP = path.resolve(process.cwd(), 'tmp-seed-local.sql');

function queryRemote(sql: string): unknown[] {
  const result = execSync(
    `npx wrangler d1 execute ${DB_NAME} --remote --json --command ${JSON.stringify(sql)}`,
    { cwd: process.cwd(), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
  const parsed = JSON.parse(result) as Array<{ results: unknown[] }>;
  return parsed[0]?.results ?? [];
}

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

function colsAndVals(row: Record<string, unknown>): { cols: string; vals: string } {
  const keys = Object.keys(row);
  return {
    cols: keys.join(', '),
    vals: keys.map((k) => lit(row[k])).join(', '),
  };
}

function rowsToInsert(table: string, rows: unknown[]): string[] {
  return (rows as Record<string, unknown>[]).map((row) => {
    const { cols, vals } = colsAndVals(row);
    return `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals});`;
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Remote D1 → Local D1 Seed');
  console.log(`  Restaurant: ${restaurantId}`);
  if (DRY_RUN) console.log('  ⚠️  DRY RUN — showing SQL only');
  console.log('═══════════════════════════════════════════════════\n');

  const statements: string[] = [
    `-- Seed for restaurant '${restaurantId}' — generated ${new Date().toISOString()}`,
    ``,
  ];

  // D1 does not support PRAGMA foreign_keys = OFF, so we must insert in FK order.
  // restaurants.owner_user_id → users.id, so fetch the owner user first.
  console.log('📥 Fetching restaurant record...');
  const [restaurant] = queryRemote(
    `SELECT * FROM restaurants WHERE id = '${restaurantId}'`,
  ) as Record<string, unknown>[];

  if (!restaurant) {
    console.error(`Restaurant '${restaurantId}' not found in remote D1.`);
    process.exit(1);
  }

  if (restaurant.owner_user_id) {
    console.log(`📥 Fetching owner user (${restaurant.owner_user_id})...`);
    const ownerRows = queryRemote(
      `SELECT * FROM users WHERE id = '${restaurant.owner_user_id}'`,
    );
    if (ownerRows.length > 0) {
      console.log('   1 rows');
      statements.push('-- users (owner)');
      statements.push(...rowsToInsert('users', ownerRows));
      statements.push('');
    }
  }

  statements.push('-- restaurants');
  statements.push(...rowsToInsert('restaurants', [restaurant]));
  statements.push('');

  const tables: Array<{ table: string; where: string }> = [
    { table: 'menus', where: `restaurant_id = '${restaurantId}'` },
    { table: 'menu_categories', where: `restaurant_id = '${restaurantId}'` },
    { table: 'menu_entries', where: `restaurant_id = '${restaurantId}'` },
    { table: 'menu_variants', where: `restaurant_id = '${restaurantId}'` },
    { table: 'menu_extras', where: `restaurant_id = '${restaurantId}'` },
  ];

  for (const { table, where } of tables) {
    console.log(`📥 Fetching ${table}...`);
    const rows = queryRemote(`SELECT * FROM ${table} WHERE ${where}`);
    console.log(`   ${rows.length} rows`);
    if (rows.length > 0) {
      statements.push(`-- ${table}`);
      statements.push(...rowsToInsert(table, rows));
      statements.push('');
    }
  }

  const sql = statements.join('\n');

  if (DRY_RUN) {
    console.log('\n--- SQL Preview ---');
    console.log(sql.slice(0, 2000) + (sql.length > 2000 ? '\n...(truncated)' : ''));
    return;
  }

  writeFileSync(SQL_TMP, sql, 'utf-8');
  console.log(`\n✅ SQL written to ${SQL_TMP}`);

  console.log(`\n🚀 Applying to local D1...`);
  execSync(`npx wrangler d1 execute ${DB_NAME} --local --file=${SQL_TMP}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log('\n✅ Local seed complete.');
}

main()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    if (existsSync(SQL_TMP)) unlinkSync(SQL_TMP);
  });

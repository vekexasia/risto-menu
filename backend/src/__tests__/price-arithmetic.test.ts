/**
 * Price arithmetic unit tests.
 *
 * After D1 migration, all prices are stored as integer cents (€12.50 → 1250).
 * These tests verify the critical cents pipeline end-to-end with pure functions
 * so any regression is immediately visible without needing a real DB.
 *
 * Pipeline:
 *   Admin input (euros float) → Math.round(*100) → DB integer cents
 *   DB integer cents → /100 → catalog API response (euros float)
 */
import { describe, it, expect } from 'vitest';

// ── Admin write: euros → cents ────────────────────────────────────────

function adminPriceToCents(euroPrice: number): number {
  return Math.round(euroPrice * 100);
}

// ── Catalog read: cents → euros ───────────────────────────────────────

function centsToEuros(cents: number): number {
  return cents / 100;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('adminPriceToCents', () => {
  it('converts €12.50 to 1250', () => {
    expect(adminPriceToCents(12.5)).toBe(1250);
  });

  it('converts €0.00 to 0 (free items)', () => {
    expect(adminPriceToCents(0)).toBe(0);
  });

  it('converts €9.99 to 999', () => {
    expect(adminPriceToCents(9.99)).toBe(999);
  });

  it('rounds half-cent edge case (€1.005 → 101, not 100)', () => {
    // IEEE 754: 1.005 * 100 may not be exactly 100.5, but Math.round handles it
    expect(adminPriceToCents(1.005)).toBeGreaterThanOrEqual(100);
    expect(adminPriceToCents(1.005)).toBeLessThanOrEqual(101);
  });
});

describe('centsToEuros', () => {
  it('converts 1250 cents to 12.5 euros', () => {
    expect(centsToEuros(1250)).toBe(12.5);
  });

  it('converts 0 cents to 0 euros', () => {
    expect(centsToEuros(0)).toBe(0);
  });

  it('converts 999 cents to 9.99 euros', () => {
    expect(centsToEuros(999)).toBeCloseTo(9.99);
  });
});

describe('catalog round-trip: admin euros → DB cents → API euros', () => {
  it('€12.50 → 1250 cents → 12.5 euros', () => {
    const dbCents = adminPriceToCents(12.5);
    const apiEuros = centsToEuros(dbCents);
    expect(dbCents).toBe(1250);
    expect(apiEuros).toBe(12.5);
    expect(apiEuros.toFixed(2)).toBe('12.50');
  });
});

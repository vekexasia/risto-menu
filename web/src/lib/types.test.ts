import { describe, it, expect } from 'vitest';
import {
  ALLERGENS,
  ALLERGEN_NAMES,
  isAllergen,
  isMenuEntryVisibleOnMenu,
  findApplicableServiceCost,
  getDefaultVariantSelection,
} from './types';
import type { MenuEntry, Variant, ServiceCost } from './types';

// ── Constants ──────────────────────────────────────────────────────────────────

describe('ALLERGENS', () => {
  it('contains 14 allergens', () => {
    expect(ALLERGENS).toHaveLength(14);
  });

  it('includes Glutine', () => {
    expect(ALLERGENS).toContain('Glutine');
  });
});

describe('ALLERGEN_NAMES', () => {
  it('has a display name for every allergen', () => {
    for (const a of ALLERGENS) {
      expect(ALLERGEN_NAMES[a]).toBeTruthy();
    }
  });
});

// ── isAllergen ─────────────────────────────────────────────────────────────────

describe('isAllergen', () => {
  it('returns true for a known allergen', () => expect(isAllergen('Glutine')).toBe(true));
  it('returns false for an unknown value', () => expect(isAllergen('Peperoni')).toBe(false));
  it('returns false for null', () => expect(isAllergen(null)).toBe(false));
});

// ── isMenuEntryVisibleOnMenu ──────────────────────────────────────────────────

function makeEntry(menuIds: string[], hidden = false): MenuEntry {
  return {
    id: 'e1',
    path: 'p',
    categoryPath: 'cp',
    name: 'Test',
    price: 10,
    description: '',
    order: 0,
    minQuantity: 1,
    outOfStock: false,
    containsFrozenIngredient: false,
    allergens: [],
    menuIds,
    hidden,
    overriddenVariantPaths: [],
    overriddenExtraPaths: [],
  };
}

describe('isMenuEntryVisibleOnMenu', () => {
  it('returns true when entry is a member of the menu', () => {
    expect(isMenuEntryVisibleOnMenu(makeEntry(['m-food', 'm-lunch']), 'm-food')).toBe(true);
  });

  it('returns false when entry is not a member of the menu', () => {
    expect(isMenuEntryVisibleOnMenu(makeEntry(['m-lunch']), 'm-food')).toBe(false);
  });

  it('returns false for hidden entries even when they are members', () => {
    expect(isMenuEntryVisibleOnMenu(makeEntry(['m-food'], true), 'm-food')).toBe(false);
  });

  it('returns false for orphan (no memberships)', () => {
    expect(isMenuEntryVisibleOnMenu(makeEntry([]), 'm-food')).toBe(false);
  });
});

// ── findApplicableServiceCost ──────────────────────────────────────────────────

describe('findApplicableServiceCost', () => {
  const costs: ServiceCost[] = [
    { fromCart: 0, price: 2 },
    { fromCart: 20, price: 1 },
    { fromCart: 50, price: 0 },
  ];

  it('returns undefined for empty cost list', () => {
    expect(findApplicableServiceCost([], 100)).toBeUndefined();
  });

  it('returns the matching tier for a cart value below the second threshold', () => {
    expect(findApplicableServiceCost(costs, 10)?.price).toBe(2);
  });

  it('returns the highest matching tier', () => {
    expect(findApplicableServiceCost(costs, 55)?.price).toBe(0);
  });

  it('returns the first tier for cart value = 0', () => {
    expect(findApplicableServiceCost(costs, 0)?.price).toBe(2);
  });
});

// ── getDefaultVariantSelection ─────────────────────────────────────────────────

describe('getDefaultVariantSelection', () => {
  const variant: Variant = {
    id: 'v1',
    path: 'p',
    name: 'Size',
    order: 0,
    selections: [
      { name: 'Small', price: 0, isDefault: false },
      { name: 'Medium', price: 1, isDefault: true },
      { name: 'Large', price: 2, isDefault: false },
    ],
  };

  it('returns the default selection', () => {
    expect(getDefaultVariantSelection(variant)?.name).toBe('Medium');
  });

  it('returns undefined when no selection is default', () => {
    const v2: Variant = { ...variant, selections: [{ name: 'X', price: 0, isDefault: false }] };
    expect(getDefaultVariantSelection(v2)).toBeUndefined();
  });
});

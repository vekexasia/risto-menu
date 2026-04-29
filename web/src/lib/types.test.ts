import { describe, it, expect } from 'vitest';
import {
  ALLERGENS,
  ALLERGEN_NAMES,
  isMenuSelection,
  isAllergen,
  menuSelectionToIdentifier,
  getOnCartMessage,
  isMenuEntryVisible,
  isMenuEntryOwnerOnly,
  findApplicableServiceCost,
  getDefaultVariantSelection,
} from './types';
import type { MenuEntry, Variant, ServiceCost, RestaurantMessages } from './types';

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

// ── isMenuSelection ────────────────────────────────────────────────────────────

describe('isMenuSelection', () => {
  it('returns true for SEATED', () => expect(isMenuSelection('SEATED')).toBe(true));
  it('returns true for TAKEAWAY', () => expect(isMenuSelection('TAKEAWAY')).toBe(true));
  it('returns false for unknown string', () => expect(isMenuSelection('DRINKS')).toBe(false));
  it('returns false for null', () => expect(isMenuSelection(null)).toBe(false));
  it('returns false for number', () => expect(isMenuSelection(42)).toBe(false));
});

// ── isAllergen ─────────────────────────────────────────────────────────────────

describe('isAllergen', () => {
  it('returns true for a known allergen', () => expect(isAllergen('Glutine')).toBe(true));
  it('returns false for an unknown value', () => expect(isAllergen('Peperoni')).toBe(false));
  it('returns false for null', () => expect(isAllergen(null)).toBe(false));
});

// ── menuSelectionToIdentifier ──────────────────────────────────────────────────

describe('menuSelectionToIdentifier', () => {
  it('maps SEATED → seated', () => expect(menuSelectionToIdentifier('SEATED')).toBe('seated'));
  it('maps TAKEAWAY → takeaway', () => expect(menuSelectionToIdentifier('TAKEAWAY')).toBe('takeaway'));
});

// ── getOnCartMessage ───────────────────────────────────────────────────────────

describe('getOnCartMessage', () => {
  const msgs: RestaurantMessages = {
    onCartSeated: 'Tavolo message',
    onCartTakeaway: 'Asporto message',
  };

  it('returns seated message for SEATED', () => {
    expect(getOnCartMessage(msgs, 'SEATED')).toBe('Tavolo message');
  });

  it('returns takeaway message for TAKEAWAY', () => {
    expect(getOnCartMessage(msgs, 'TAKEAWAY')).toBe('Asporto message');
  });
});

// ── isMenuEntryVisible ─────────────────────────────────────────────────────────

function makeEntry(visibility: ('all' | 'seated' | 'takeaway')[]): MenuEntry {
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
    menuVisibility: visibility,
    overriddenVariantPaths: [],
    overriddenExtraPaths: [],
  };
}

describe('isMenuEntryVisible', () => {
  it('all visibility is visible on SEATED', () => {
    expect(isMenuEntryVisible(makeEntry(['all']), 'SEATED')).toBe(true);
  });

  it('all visibility is visible on TAKEAWAY', () => {
    expect(isMenuEntryVisible(makeEntry(['all']), 'TAKEAWAY')).toBe(true);
  });

  it('seated visibility is visible on SEATED only', () => {
    expect(isMenuEntryVisible(makeEntry(['seated']), 'SEATED')).toBe(true);
    expect(isMenuEntryVisible(makeEntry(['seated']), 'TAKEAWAY')).toBe(false);
  });

  it('takeaway visibility is visible on TAKEAWAY only', () => {
    expect(isMenuEntryVisible(makeEntry(['takeaway']), 'TAKEAWAY')).toBe(true);
    expect(isMenuEntryVisible(makeEntry(['takeaway']), 'SEATED')).toBe(false);
  });

  it('empty visibility is not visible on either menu', () => {
    expect(isMenuEntryVisible(makeEntry([]), 'SEATED')).toBe(false);
    expect(isMenuEntryVisible(makeEntry([]), 'TAKEAWAY')).toBe(false);
  });
});

// ── isMenuEntryOwnerOnly ───────────────────────────────────────────────────────

describe('isMenuEntryOwnerOnly', () => {
  it('empty visibility on SEATED is owner-only', () => {
    expect(isMenuEntryOwnerOnly(makeEntry([]), 'SEATED')).toBe(true);
  });

  it('empty visibility on TAKEAWAY is NOT owner-only', () => {
    expect(isMenuEntryOwnerOnly(makeEntry([]), 'TAKEAWAY')).toBe(false);
  });

  it('non-empty visibility is never owner-only', () => {
    expect(isMenuEntryOwnerOnly(makeEntry(['all']), 'SEATED')).toBe(false);
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


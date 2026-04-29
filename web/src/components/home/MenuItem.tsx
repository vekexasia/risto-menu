'use client';

import Image from 'next/image';
import type { MenuEntry, Allergen, Variant, RestaurantData, MenuCategory } from '@/lib/types';
import { useRestaurantStore } from '@/stores/restaurantStore';
import clsx from 'clsx';
import { getContentDisplayText, getLocalizedContentValue } from '@/lib/content-presentation';

interface MenuItemProps {
  /** The menu entry to display */
  entry: MenuEntry;
  /** Restaurant data for category lookup */
  restaurant: RestaurantData;
  /** Optional locale for i18n */
  locale?: string;
}

/**
 * MenuItem component displays a single menu entry with:
 * - Name, price, and description
 * - Allergen icons if present
 * - Variants summary
 * - "Out of stock" badge if applicable
 * - Optional item image
 *
 * View-only component (no cart functionality).
 * Corresponds to the menu item display in HomeList/CartedHomeItem in Flutter.
 */
export function MenuItem({ entry, restaurant, locale }: MenuItemProps) {
  const getVariant = useRestaurantStore((state) => state.getVariant);
  const name = getContentDisplayText({
    entity: entry,
    field: 'name',
    locale,
    restaurantId: restaurant.id,
  });
  const description = getLocalizedContentValue(entry, 'description', locale);
  const hasDescription = description && description.trim().length > 0;
  const variants = getEntryVariants(entry, restaurant, getVariant);
  const formattedPrice = formatPrice(entry);

  return (
    <article
      className={clsx(
        'relative border-b-2 border-gray-100',
        entry.outOfStock && 'opacity-60'
      )}
    >
      <div className="px-4 py-4">
        <div className="flex gap-3">
          {/* Content */}
          <div className="flex-1">
            {/* Name */}
            <h3
              className={clsx(
                'text-base font-medium text-gray-900',
                entry.outOfStock && 'line-through'
              )}
            >
              <span className="block">{name.primary}</span>
              {name.secondary && (
                <span className="mt-0.5 block text-xs font-medium text-gray-500 no-underline">
                  {name.secondary}
                </span>
              )}
            </h3>

            {/* Description */}
            {hasDescription && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {description}
              </p>
            )}

            {/* Allergens */}
            {entry.allergens.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {entry.allergens.map((allergen) => (
                  <AllergenBadge key={allergen} allergen={allergen} />
                ))}
              </div>
            )}

            {/* Variants summary */}
            {variants.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  {variants.map((v) => getVariantName(v, locale)).join(' | ')}
                </p>
              </div>
            )}

            {/* Price */}
            <p className="mt-2 font-medium tracking-wide text-gray-700">
              {formattedPrice}
            </p>

            {/* Out of stock badge */}
            {entry.outOfStock && (
              <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Out of Stock
              </span>
            )}

            {/* Frozen ingredient indicator */}
            {entry.containsFrozenIngredient && (
              <span className="mt-1 inline-block text-xs text-gray-400">
                * Contains frozen ingredients
              </span>
            )}
          </div>

          {/* Item Image */}
          {entry.image && (
            <div className="flex-shrink-0">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-200">
                <Image
                  src={entry.image}
                  alt={name.primary}
                  fill
                  className="object-cover"
                  sizes="64px"
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * AllergenBadge displays a small badge/icon for an allergen.
 */
function AllergenBadge({ allergen }: { allergen: Allergen }) {
  const shortName = ALLERGEN_SHORT_NAMES[allergen] || allergen;

  return (
    <span
      className="inline-flex h-5 items-center rounded bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"
      title={ALLERGEN_FULL_NAMES[allergen]}
    >
      {shortName}
    </span>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the display name for a menu entry with i18n support.
 */
/**
 * Get the variants for a menu entry (from entry overrides or category defaults).
 */
function getEntryVariants(
  entry: MenuEntry,
  restaurant: RestaurantData,
  getVariant: (path: string) => Variant | undefined
): Variant[] {
  // Get the paths to look up (entry overrides or from category)
  const variantPaths = entry.overriddenVariantPaths;

  if (!variantPaths || variantPaths.length === 0) {
    // Try to get from category
    const category = restaurant.categories.find(
      (c) => c.path === entry.categoryPath
    );
    if (!category || !category.variantPaths) {
      return [];
    }
    return category.variantPaths
      .map((path) => getVariant(path))
      .filter((v): v is Variant => v !== undefined);
  }

  return variantPaths
    .map((path) => getVariant(path))
    .filter((v): v is Variant => v !== undefined);
}

/**
 * Get the display name for a variant with i18n support.
 */
function getVariantName(variant: Variant, locale?: string): string {
  if (!locale || !variant.i18n) {
    return variant.name;
  }
  const translation = variant.i18n[locale];
  return translation?.name || variant.name;
}

/**
 * Format the price for display.
 * Handles price units (e.g., per kg) and minimum quantities.
 */
function formatPrice(entry: MenuEntry): string {
  const priceStr = `€${entry.price.toFixed(2)}`;

  if (entry.priceUnit) {
    return `${priceStr}/${entry.priceUnit}`;
  }

  if (entry.minQuantity && entry.minQuantity > 1) {
    return `${priceStr} (min. ${entry.minQuantity})`;
  }

  return priceStr;
}

// ============================================================================
// Allergen Data
// ============================================================================

const ALLERGEN_SHORT_NAMES: Record<Allergen, string> = {
  'Anidride-Solforosa-e-Solfiti': 'SO2',
  Arachidi: 'AR',
  Crostacei: 'CR',
  'Frutta-a-Guscio': 'FG',
  Glutine: 'GL',
  'Latte-e-Derivati': 'LA',
  Lupini: 'LU',
  Molluschi: 'MO',
  Pesce: 'PE',
  Sedano: 'SE',
  Senape: 'SN',
  Sesamo: 'SS',
  Soia: 'SO',
  Uova: 'UO',
};

const ALLERGEN_FULL_NAMES: Record<Allergen, string> = {
  'Anidride-Solforosa-e-Solfiti': 'Sulfites',
  Arachidi: 'Peanuts',
  Crostacei: 'Crustaceans',
  'Frutta-a-Guscio': 'Tree Nuts',
  Glutine: 'Gluten',
  'Latte-e-Derivati': 'Milk & Dairy',
  Lupini: 'Lupins',
  Molluschi: 'Molluscs',
  Pesce: 'Fish',
  Sedano: 'Celery',
  Senape: 'Mustard',
  Sesamo: 'Sesame',
  Soia: 'Soy',
  Uova: 'Eggs',
};

export default MenuItem;

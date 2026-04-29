'use client';

import type { MenuCategory } from '@/lib/types';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { getContentDisplayText } from '@/lib/content-presentation';

interface CategoryHeaderProps {
  /** The category to display */
  category: MenuCategory;
  /** Optional locale for i18n */
  locale?: string;
  /** Optional custom padding/insets */
  className?: string;
}

/**
 * CategoryHeader component displays a section header for a menu category.
 * - Uppercase category name
 * - Sticky positioning within the scroll container
 * - Background color matches app theme
 *
 * Corresponds to CategoryWidget in Flutter.
 */
export function CategoryHeader({
  category,
  locale,
  className,
}: CategoryHeaderProps) {
  const restaurantId = useRestaurantStore((state) => state.data?.id);
  const name = getContentDisplayText({
    entity: category,
    field: 'name',
    locale,
    restaurantId,
  });

  return (
    <header
      id={`category-header-${category.id}`}
      className={className || 'sticky top-[48px] z-20 bg-gray-50 px-4 pb-3 pt-5'}
    >
      <h2 className="text-lg font-semibold tracking-wide text-gray-900">
        <span className="block">{name.primary.toUpperCase()}</span>
        {name.secondary && (
          <span className="mt-0.5 block text-xs font-medium tracking-normal text-gray-500 normal-case">
            {name.secondary}
          </span>
        )}
      </h2>
    </header>
  );
}

export default CategoryHeader;

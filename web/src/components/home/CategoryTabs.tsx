'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { MenuCategory } from '@/lib/types';
import clsx from 'clsx';

interface CategoryTabsProps {
  /** List of menu categories to display as tabs */
  categories: MenuCategory[];
  /** Currently active/visible category ID */
  activeCategoryId: string | null;
  /** Callback when a category tab is clicked */
  onCategoryClick: (categoryId: string) => void;
  /** Optional search filter - hides categories with no matching items */
  searchFilter?: string;
}

/**
 * CategoryTabs component displays horizontal scrollable tabs for menu categories.
 * - Highlights the currently visible category
 * - Auto-scrolls to keep the active tab visible
 * - Click scrolls to that category in the menu list
 *
 * Corresponds to TopCategories in Flutter.
 */
export function CategoryTabs({
  categories,
  activeCategoryId,
  onCategoryClick,
  searchFilter,
}: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Filter categories based on search if provided
  const visibleCategories = searchFilter
    ? categories.filter((category) =>
        category.entries.some((entry) =>
          entry.name.toLowerCase().includes(searchFilter.toLowerCase())
        )
      )
    : categories;

  // Auto-scroll to keep active tab visible
  useEffect(() => {
    if (!activeCategoryId || !scrollContainerRef.current) return;

    const activeTab = tabRefs.current.get(activeCategoryId);
    if (!activeTab) return;

    const container = scrollContainerRef.current;
    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate if the tab is outside the visible area
    const isTabOutOfView =
      tabRect.left < containerRect.left ||
      tabRect.right > containerRect.right;

    if (isTabOutOfView) {
      // Scroll to center the active tab
      const scrollLeft =
        activeTab.offsetLeft -
        container.clientWidth / 2 +
        activeTab.clientWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [activeCategoryId]);

  const handleTabClick = useCallback(
    (categoryId: string) => {
      onCategoryClick(categoryId);
    },
    [onCategoryClick]
  );

  const setTabRef = useCallback(
    (categoryId: string) => (element: HTMLButtonElement | null) => {
      if (element) {
        tabRefs.current.set(categoryId, element);
      } else {
        tabRefs.current.delete(categoryId);
      }
    },
    []
  );

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <nav
      className="sticky top-0 z-30 w-full bg-white shadow-sm"
      aria-label="Menu categories"
    >
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide"
        role="tablist"
        aria-label="Category tabs"
      >
        {visibleCategories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <button
              key={category.id}
              ref={setTabRef(category.id)}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`category-section-${category.id}`}
              onClick={() => handleTabClick(category.id)}
              className={clsx(
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              )}
            >
              {getCategoryName(category).toUpperCase()}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Get the display name for a category, with i18n support.
 * Falls back to the base name if no translation is available.
 */
function getCategoryName(category: MenuCategory, locale?: string): string {
  // If no locale specified or no i18n data, return base name
  if (!locale || !category.i18n) {
    return category.name;
  }

  // Try to get translated name
  const translation = category.i18n[locale];
  if (translation?.name) {
    return translation.name;
  }

  return category.name;
}

export default CategoryTabs;

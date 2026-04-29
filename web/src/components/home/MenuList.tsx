'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import type { MenuCategory, MenuEntry, RestaurantData, MenuSelection } from '@/lib/types';
import { isMenuEntryVisible } from '@/lib/types';
import { CategoryHeader } from './CategoryHeader';
import { MenuItem } from './MenuItem';

interface MenuListProps {
  /** Restaurant data containing categories and caches */
  restaurant: RestaurantData;
  /** Currently selected menu type (SEATED or TAKEAWAY) */
  menuSelection: MenuSelection;
  /** Callback when visible category changes */
  onVisibleCategoryChange: (categoryId: string) => void;
  /** Optional search filter to show only matching items */
  searchFilter?: string;
  /** Optional locale for i18n */
  locale?: string;
  /** Category ID to scroll to when set */
  scrollToCategoryId?: string | null;
  /** Callback when scroll to category is complete */
  onScrollComplete?: () => void;
}

/**
 * MenuList component displays all menu categories and their items.
 * - Category headers with sticky behavior
 * - Intersection observer for tracking which category is visible
 * - Search filtering support
 * - Scroll-to-category functionality
 *
 * Corresponds to HomeList in Flutter.
 */
export function MenuList({
  restaurant,
  menuSelection,
  onVisibleCategoryChange,
  searchFilter,
  locale,
  scrollToCategoryId,
  onScrollComplete,
}: MenuListProps) {
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingProgrammatically = useRef(false);

  // Get visible categories (non-empty ones)
  const visibleCategories = getVisibleCategories(
    restaurant.categories,
    menuSelection,
    searchFilter
  );

  // Handle scroll-to-category requests
  useEffect(() => {
    if (!scrollToCategoryId) return;

    const categoryElement = categoryRefs.current.get(scrollToCategoryId);
    if (!categoryElement) return;

    // Mark that we're scrolling programmatically to avoid updating visible category
    isScrollingProgrammatically.current = true;

    // Calculate scroll position (accounting for sticky header)
    const headerOffset = 100; // Adjust based on header height
    const elementPosition = categoryElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    // Reset programmatic scroll flag after animation completes
    const timeoutId = setTimeout(() => {
      isScrollingProgrammatically.current = false;
      onScrollComplete?.();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [scrollToCategoryId, onScrollComplete]);

  const setCategoryRef = useCallback(
    (categoryId: string) => (element: HTMLElement | null) => {
      if (element) {
        categoryRefs.current.set(categoryId, element);
      } else {
        categoryRefs.current.delete(categoryId);
      }
    },
    []
  );

  const handleCategoryInView = useCallback(
    (categoryId: string, inView: boolean) => {
      if (inView && !isScrollingProgrammatically.current) {
        onVisibleCategoryChange(categoryId);
      }
    },
    [onVisibleCategoryChange]
  );

  if (visibleCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-gray-500">No items found</p>
        {searchFilter && (
          <p className="mt-2 text-sm text-gray-400">
            Try adjusting your search
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="pb-20">
      {visibleCategories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          restaurant={restaurant}
          menuSelection={menuSelection}
          locale={locale}
          searchFilter={searchFilter}
          setCategoryRef={setCategoryRef}
          onInView={handleCategoryInView}
        />
      ))}
    </div>
  );
}

/**
 * CategorySection wraps a single category with intersection observer.
 */
interface CategorySectionProps {
  category: MenuCategory;
  restaurant: RestaurantData;
  menuSelection: MenuSelection;
  locale?: string;
  searchFilter?: string;
  setCategoryRef: (categoryId: string) => (element: HTMLElement | null) => void;
  onInView: (categoryId: string, inView: boolean) => void;
}

function CategorySection({
  category,
  restaurant,
  menuSelection,
  locale,
  searchFilter,
  setCategoryRef,
  onInView,
}: CategorySectionProps) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '-100px 0px -50% 0px', // Trigger when header is near top
  });

  // Notify parent when category comes into view
  useEffect(() => {
    onInView(category.id, inView);
  }, [category.id, inView, onInView]);

  // Filter entries for this category
  const visibleEntries = getVisibleEntries(
    category.entries,
    menuSelection,
    searchFilter
  );

  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <section
      ref={(el) => {
        ref(el);
        setCategoryRef(category.id)(el);
      }}
      id={`category-section-${category.id}`}
      aria-labelledby={`category-header-${category.id}`}
    >
      <CategoryHeader category={category} locale={locale} />
      <div className="bg-white">
        {visibleEntries.map((entry) => (
          <MenuItem
            key={entry.id}
            entry={entry}
            restaurant={restaurant}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filter categories to only include those with visible entries.
 */
function getVisibleCategories(
  categories: MenuCategory[],
  menuSelection: MenuSelection,
  searchFilter?: string
): MenuCategory[] {
  return categories.filter((category) => {
    const visibleEntries = getVisibleEntries(
      category.entries,
      menuSelection,
      searchFilter
    );
    return visibleEntries.length > 0;
  });
}

/**
 * Filter entries based on menu visibility and search.
 */
function getVisibleEntries(
  entries: MenuEntry[],
  menuSelection: MenuSelection,
  searchFilter?: string
): MenuEntry[] {
  return entries.filter((entry) => {
    // Check menu visibility
    if (!isMenuEntryVisible(entry, menuSelection)) {
      return false;
    }

    // Check search filter
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      const nameMatches = entry.name.toLowerCase().includes(searchLower);
      const descMatches = entry.description?.toLowerCase().includes(searchLower);
      if (!nameMatches && !descMatches) {
        return false;
      }
    }

    return true;
  });
}

export default MenuList;

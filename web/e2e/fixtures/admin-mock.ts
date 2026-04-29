import type { Page } from '@playwright/test';

// Plain mock data matching the RestaurantData interface shape
export const MOCK_RESTAURANT_ID = 'demo-restaurant';
export const MOCK_RESTAURANT_SLUG = 'demo-restaurant';

export const MOCK_RESTAURANT = {
  id: MOCK_RESTAURANT_ID,
  name: 'Ristorante Test E2E',
  categories: [
    {
      id: 'cat-antipasti',
      path: `restaurants/${MOCK_RESTAURANT_ID}/menuEntries/cat-antipasti`,
      name: 'Antipasti',
      order: 0,
      variantPaths: [],
      extraPaths: [],
      i18n: { en: { name: 'Starters' } },
      entries: [
        {
          id: 'entry-bruschetta',
          path: `restaurants/${MOCK_RESTAURANT_ID}/menuEntries/cat-antipasti/entries/entry-bruschetta`,
          categoryPath: `restaurants/${MOCK_RESTAURANT_ID}/menuEntries/cat-antipasti`,
          name: 'Bruschetta',
          description: 'Pane tostato con pomodori freschi',
          price: 800,
          order: 0,
          outOfStock: false,
          containsFrozenIngredient: false,
          allergens: ['Glutine'],
          menuVisibility: ['all'],
          i18n: { en: { name: 'Bruschetta', desc: 'Toasted bread with fresh tomatoes' } },
        },
      ],
    },
    {
      id: 'cat-secondi',
      path: `restaurants/${MOCK_RESTAURANT_ID}/menuEntries/cat-secondi`,
      name: 'Secondi Piatti',
      order: 1,
      variantPaths: [],
      extraPaths: [],
      i18n: {},
      entries: [],
    },
  ],
};

export const MOCK_USER = {
  uid: 'test-admin-uid',
  email: 'test@admin.com',
  displayName: 'Test Admin',
};

/** Inject fake admin auth + mock restaurant data before page load */
export async function setupAdminTestEnv(page: Page, restaurantId = MOCK_RESTAURANT_ID) {
  await page.addInitScript(
    ({ restaurant, user, rid }) => {
      (window as any).__playwright_admin__ = { user, restaurantId: rid };
      (window as any).__playwright_restaurant__ = restaurant;
    },
    { restaurant: MOCK_RESTAURANT, user: MOCK_USER, rid: restaurantId }
  );
}

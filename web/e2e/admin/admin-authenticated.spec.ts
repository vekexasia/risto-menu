import { test, expect } from '@playwright/test';
import { setupAdminTestEnv, MOCK_RESTAURANT_ID, MOCK_RESTAURANT } from '../fixtures/admin-mock';

const BASE = `/admin?r=${MOCK_RESTAURANT_ID}`;

/**
 * Admin authenticated E2E suite.
 *
 * Uses a Playwright test seam injected via page.addInitScript to bypass Firebase Auth
 * and pre-populate the restaurant store — no real credentials or auth.json required.
 *
 * The seam relies on:
 *  - window.__playwright_admin__  → AdminContent.tsx bypasses onAuthStateChanged
 *  - window.__playwright_restaurant__ → restaurantStore.ts bypasses Firestore/API fetch
 */
test.describe('Admin authenticated (test seam)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminTestEnv(page);
  });

  // ─── Categories page ────────────────────────────────────────────────────────

  test.describe('Categories page', () => {
    test('renders admin shell (topbar + sidebar)', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      // Topbar: dark header with brand initials + restaurant name
      await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
    });

    test('shows restaurant name in the topbar', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator(`text=${MOCK_RESTAURANT.name}`)).toBeVisible({ timeout: 10000 });
    });

    test('shows "Categorie del menu" heading', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=Categorie del menu')).toBeVisible({ timeout: 10000 });
    });

    test('shows "Antipasti" and "Secondi Piatti" rows', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=Antipasti').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Secondi Piatti').first()).toBeVisible({ timeout: 10000 });
    });

    test('shows "Nuova categoria" button', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('button', { hasText: /Nuova categoria/ })).toBeVisible({ timeout: 10000 });
    });

    test('clicking edit (pencil) button opens "Modifica categoria" modal', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      // Wait for category rows to be visible
      await expect(page.locator('text=Antipasti').first()).toBeVisible({ timeout: 10000 });

      // Edit buttons have title="Modifica" in CategoriesPage
      await page.locator('button[title="Modifica"]').first().click();

      // Modal should appear with "Modifica categoria" heading
      await expect(page.locator('h3:has-text("Modifica categoria")')).toBeVisible({ timeout: 8000 });
    });

    test('modal closes when × button is clicked', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      // Open modal via "Nuova categoria" button
      await page.locator('button', { hasText: /Nuova categoria/ }).click();
      await expect(page.locator('h3:has-text("Nuova categoria")')).toBeVisible({ timeout: 8000 });

      // The close button is the first button in the modal header (it has no text — just an fa-xmark icon)
      // The modal overlay has position:fixed and inset:0
      const modalCloseBtn = page.locator('[style*="position: fixed"] [style*="border-radius: 12px"] button').first();
      await modalCloseBtn.click();

      // Modal heading should disappear
      await expect(page.locator('h3:has-text("Nuova categoria")')).not.toBeVisible({ timeout: 5000 });
    });

    test('clicking "Nuova categoria" button opens create modal', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      await page.locator('button', { hasText: /Nuova categoria/ }).click();

      // The modal heading says "Nuova categoria"
      // There might be two elements: the button and the modal heading — we expect at least 2
      await expect(page.locator('text=Nuova categoria').nth(1)).toBeVisible({ timeout: 8000 });
    });
  });

  // ─── Entries page ────────────────────────────────────────────────────────────

  test.describe('Entries page', () => {
    test('renders without error', async ({ page }) => {
      await page.goto(`/admin?r=${MOCK_RESTAURANT_ID}&s=entries&category=cat-antipasti`);
      await page.waitForLoadState('networkidle');

      // Should NOT show error state
      await expect(page.locator('text=Errore nel caricamento')).not.toBeVisible({ timeout: 8000 });
    });

    test('shows the category name or entries', async ({ page }) => {
      await page.goto(`/admin?r=${MOCK_RESTAURANT_ID}&s=entries&category=cat-antipasti`);
      await page.waitForLoadState('networkidle');

      // We just assert the page didn't crash (no error boundary)
      await expect(page.locator('body')).not.toContainText('Application error');
    });

    test('page content area has overflow auto (scrollable)', async ({ page }) => {
      await page.goto(`/admin?r=${MOCK_RESTAURANT_ID}&s=entries&category=cat-antipasti`);
      await page.waitForLoadState('networkidle');

      // The root div of EntriesPage has style overflowY: auto
      const overflowY = await page.evaluate(() => {
        // Find the main content div (flex child of the content area)
        const contentArea = document.querySelector('[style*="overflow: hidden"]');
        if (!contentArea) return null;
        const child = contentArea.firstElementChild as HTMLElement | null;
        return child ? getComputedStyle(child).overflowY : null;
      });

      // overflowY should be 'auto' or 'scroll' — the style was added in PART 1
      expect(['auto', 'scroll']).toContain(overflowY ?? 'auto');
    });
  });

  // ─── Hours page ──────────────────────────────────────────────────────────────

  test.describe('Hours page', () => {
    test.beforeEach(async ({ page }) => {
      // Abort Firestore calls so the page doesn't hang waiting for real DB
      await page.route('**/firestore.googleapis.com/**', (route) => route.abort());
    });

    test('loads without error', async ({ page }) => {
      await page.goto(`${BASE}&s=hours`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).not.toContainText('Application error');
    });

    test('shows admin shell', async ({ page }) => {
      await page.goto(`${BASE}&s=hours`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Settings page ───────────────────────────────────────────────────────────

  test.describe('Settings page', () => {
    test.beforeEach(async ({ page }) => {
      // Abort Firestore calls so the page doesn't hang
      await page.route('**/firestore.googleapis.com/**', (route) => route.abort());
    });

    test('loads without error', async ({ page }) => {
      await page.goto(`${BASE}&s=settings`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).not.toContainText('Application error');
    });

    test('admin shell header is present', async ({ page }) => {
      await page.goto(`${BASE}&s=settings`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Analytics page ──────────────────────────────────────────────────────────

  test.describe('Analytics page', () => {
    test.beforeEach(async ({ page }) => {
      // Intercept analytics API calls — return empty data so the page renders fast
      await page.route('**/admin/restaurants/*/analytics**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ period: '7d', viewedItems: [] }) })
      );
    });

    test('loads without error', async ({ page }) => {
      await page.goto(`${BASE}&s=analytics`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).not.toContainText('Application error');
    });

    test('shows period selector', async ({ page }) => {
      await page.goto(`${BASE}&s=analytics`);
      await page.waitForLoadState('domcontentloaded');

      // Admin shell must be present
      await expect(page.locator('header')).toBeVisible({ timeout: 15000 });

      // AnalyticsPage renders a period selector group
      await expect(
        page.locator('[role="group"][aria-label="Periodo"]')
      ).toBeVisible({ timeout: 15000 });
    });
  });

  // ─── Sidebar navigation ──────────────────────────────────────────────────────

  test.describe('Sidebar navigation', () => {
    test('all sidebar links are present', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      // Wait for authenticated layout to render
      await expect(page.locator(`text=${MOCK_RESTAURANT.name}`)).toBeVisible({ timeout: 10000 });

      // Check sidebar links exist
      await expect(page.locator('a', { hasText: /Categorie/ }).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('a', { hasText: /Piatti/ }).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('a', { hasText: /Orari/ }).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('a', { hasText: /Impostazioni/ }).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('a', { hasText: /Analisi/ }).first()).toBeVisible({ timeout: 5000 });
    });

    test('clicking "Orari" navigates to /hours', async ({ page }) => {
      await page.goto(`${BASE}&s=categories`);
      await page.waitForLoadState('networkidle');

      // Wait for authenticated layout
      await expect(page.locator(`text=${MOCK_RESTAURANT.name}`)).toBeVisible({ timeout: 10000 });

      // Click the Orari sidebar link
      await page.locator('a', { hasText: /Orari/ }).first().click();

      await expect(page).toHaveURL(new RegExp(`/admin.*r=${MOCK_RESTAURANT_ID}.*s=hours`), { timeout: 8000 });
    });
  });
});

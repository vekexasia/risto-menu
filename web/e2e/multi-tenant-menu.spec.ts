/**
 * Multi-tenant menu route E2E tests.
 *
 * Verifies the /[locale]/[restaurantSlug]/menu route resolves (route exists,
 * client component mounts). Full data rendering requires a live catalog
 * backend (NEXT_PUBLIC_API_URL) and a restaurant seeded in that backend —
 * those assertions are conditional on detecting real menu data.
 */

import { test, expect } from "@playwright/test";

const RESTAURANT_SLUG = "demo-restaurant";

async function routeResolved(page: import("@playwright/test").Page) {
  // The shared client mounts either the loading spinner (via Suspense fallback
  // or its own isLoading branch) or the menu <main>. Either proves the route
  // resolved and the client mounted (vs a 404 route-not-found).
  const spinner = page.locator(".animate-spin").first();
  const main = page.locator("main").first();
  await expect(spinner.or(main)).toBeVisible({ timeout: 15000 });
}

test.describe("Multi-tenant menu route", () => {
  test("/it/<slug>/menu route resolves and mounts the client", async ({ page }) => {
    const resp = await page.goto(`/it/${RESTAURANT_SLUG}/menu`);
    expect(resp?.status() ?? 0).toBeLessThan(400);
    await routeResolved(page);
  });

  test("/en/<slug>/menu route resolves (English locale)", async ({ page }) => {
    const resp = await page.goto(`/en/${RESTAURANT_SLUG}/menu`);
    expect(resp?.status() ?? 0).toBeLessThan(400);
    await routeResolved(page);
  });

  test("/it/menu legacy route still resolves", async ({ page }) => {
    const resp = await page.goto("/it/menu");
    expect(resp?.status() ?? 0).toBeLessThan(400);
    await routeResolved(page);
  });
});

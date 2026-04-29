/**
 * Onboarding flow E2E tests.
 *
 * Unauthenticated: verifies the onboarding page renders its form
 * (creation flow requires auth and a live backend and is covered by
 * the admin-api authenticated suite).
 */

import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  test("onboarding page renders the creation form", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByLabel(/nome del ristorante/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: /crea il ristorante/i }),
    ).toBeVisible();
  });

  test("submit button is disabled when name is empty", async ({ page }) => {
    await page.goto("/onboarding");
    const btn = page.getByRole("button", { name: /crea il ristorante/i });
    await expect(btn).toBeDisabled();
  });

  test("typing a name enables the submit button", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/nome del ristorante/i).fill("Trattoria Test E2E");

    const btn = page.getByRole("button", { name: /crea il ristorante/i });
    await expect(btn).toBeEnabled();
  });

  test("/admin without auth redirects to login gate", async ({ page }) => {
    await page.goto("/admin");
    // /admin → /admin/categories (route redirect) → login gate
    await expect(page).toHaveURL(/\/admin\//, { timeout: 5000 });
    await expect(page.locator("text=Accedi per gestire il ristorante")).toBeVisible({
      timeout: 8000,
    });
  });
});

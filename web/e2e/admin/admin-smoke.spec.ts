import { test, expect } from "@playwright/test";

/**
 * Admin area smoke tests.
 *
 * These run without authentication — they verify the admin gate (login card)
 * and the route structure (/admin → redirect → /admin/categories).
 *
 * Authenticated flows require Firebase Auth emulator or a test seam; that's
 * tracked separately and not in scope here.
 */
test.describe("Admin smoke (unauthenticated)", () => {
  test("/admin redirects to /admin/categories", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/categories/, { timeout: 5000 });
  });

  test("login card is shown when not authenticated", async ({ page }) => {
    await page.goto("/admin");

    // The auth gate renders an h1 with "Admin" and a sign-in CTA
    await expect(page.locator("h1")).toContainText("Admin", { timeout: 8000 });
    await expect(page.locator("text=Accedi per gestire il ristorante")).toBeVisible();
  });

  test("Google sign-in button is present on the login card", async ({
    page,
  }) => {
    await page.goto("/admin");
    // The button contains "Google" text inside the sign-in card
    const signInBtn = page.locator("button", { hasText: /Google/i });
    await expect(signInBtn).toBeVisible({ timeout: 8000 });
  });
});

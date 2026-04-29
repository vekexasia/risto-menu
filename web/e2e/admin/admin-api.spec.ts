/**
 * Admin E2E tests — authenticated, against the D1 API.
 *
 * Prerequisites:
 *   1. wrangler dev --remote running on port 8787
 *   2. Next.js dev running on port 3000 with NEXT_PUBLIC_API_URL=http://localhost:8787
 *   3. Session saved: npx playwright test --project=auth-setup
 *
 * These tests use the saved session from e2e/fixtures/auth.json.
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_FILE = path.join(__dirname, "../fixtures/auth.json");
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Skip entire suite if no API or no saved session
const hasAuth = fs.existsSync(AUTH_FILE);

test.describe("Admin — D1 API", () => {
  test.skip(
    !API_URL,
    "Skipped: NEXT_PUBLIC_API_URL not set (not in API mode)"
  );
  test.skip(!hasAuth, "Skipped: run auth-setup first (npx playwright test --project=auth-setup)");

  test.use({ storageState: AUTH_FILE });

  test("categories page loads and shows list from D1", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Should NOT show the login gate
    await expect(
      page.locator("text=Accedi per gestire il ristorante")
    ).not.toBeVisible({ timeout: 5000 });

    // Should show the categories heading
    await expect(page.locator("h2")).toContainText("Categorie");

    // At least one category should be visible
    const categories = page.locator(".space-y-2 > div, [class*='rounded-lg']");
    await expect(categories.first()).toBeVisible({ timeout: 10000 });
  });

  test("can open and cancel category edit modal", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Click the edit (pencil) button on the first category
    const editBtn = page.locator("button[title='Modifica nome']").first();
    await editBtn.waitFor({ timeout: 10000 });
    await editBtn.click();

    // Modal should appear
    await expect(page.locator("text=Modifica Categoria")).toBeVisible();

    // Cancel button closes it
    await page.locator("button:has-text('Annulla')").click();
    await expect(page.locator("text=Modifica Categoria")).not.toBeVisible();
  });

  test("category save goes to D1 API (check network request)", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Intercept the API PUT call
    const apiCallPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/admin/restaurants/") &&
        req.url().includes("/categories/") &&
        req.method() === "PUT",
      { timeout: 15000 }
    );

    // Open edit modal
    const editBtn = page.locator("button[title='Modifica nome']").first();
    await editBtn.waitFor({ timeout: 10000 });
    await editBtn.click();

    // Get current name and re-save (no actual change needed)
    const nameInput = page.locator("input[type='text']").first();
    const currentName = await nameInput.inputValue();
    await nameInput.fill(currentName); // touch it to ensure save is enabled

    // Click save
    await page.locator("button:has-text('Salva')").click();

    // Verify the PUT hit our backend, not Firestore
    const req = await apiCallPromise;
    expect(req.url()).toContain("localhost:8787");
  });

  test("entries page loads for first category", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Click the first category link
    const categoryLink = page
      .locator("a[href*='s=entries']")
      .first();
    await categoryLink.waitFor({ timeout: 10000 });
    await categoryLink.click();

    await page.waitForLoadState("networkidle");

    // Should show entries (or "no entries" message)
    await expect(page.locator("h2, [class*='font-bold']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("settings page loads restaurant data from API", async ({ page }) => {
    // Intercept the catalog or settings load
    const catalogReq = page.waitForRequest(
      (req) =>
        req.url().includes("localhost:8787") &&
        req.url().includes("/catalog/"),
      { timeout: 10000 }
    );

    await page.goto("/admin");

    // Should have hit the API, not just Firestore
    const req = await catalogReq;
    expect(req.url()).toContain("demo-restaurant");
  });
});

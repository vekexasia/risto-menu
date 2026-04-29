/**
 * Admin CRUD smoke E2E — authenticated.
 *
 * Verifies the admin UI can edit catalog data via the D1 API.
 * Avoids creating/deleting categories to keep the seeded menu stable;
 * instead re-saves existing rows to prove the PUT hits the API.
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_FILE = path.join(__dirname, "../fixtures/auth.json");
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const hasAuth = fs.existsSync(AUTH_FILE);

test.describe("Admin CRUD smoke", () => {
  test.skip(!API_URL, "Skipped: NEXT_PUBLIC_API_URL not set");
  test.skip(!hasAuth, "Skipped: run auth-setup first");

  test.use({ storageState: AUTH_FILE });

  test("category list renders and shows at least one category", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h2")).toContainText("Categorie", { timeout: 10000 });

    const editButtons = page.locator("button[title='Modifica nome']");
    await expect(editButtons.first()).toBeVisible({ timeout: 10000 });
    const count = await editButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking a category navigates to its entries page", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const categoryLink = page
      .locator("a[href*='s=entries']")
      .first();
    await categoryLink.waitFor({ timeout: 10000 });
    await categoryLink.click();

    await expect(page).toHaveURL(/\/admin\/entries\?category=/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
  });

  test("edit modal opens and closes without saving", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const editBtn = page.locator("button[title='Modifica nome']").first();
    await editBtn.waitFor({ timeout: 10000 });
    await editBtn.click();

    await expect(page.locator("text=Modifica Categoria")).toBeVisible();
    await page.locator("button:has-text('Annulla')").click();
    await expect(page.locator("text=Modifica Categoria")).not.toBeVisible();
  });

  test("saving a category PUTs to the D1 backend", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const apiCallPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/admin/restaurants/") &&
        req.url().includes("/categories/") &&
        req.method() === "PUT",
      { timeout: 15000 },
    );

    const editBtn = page.locator("button[title='Modifica nome']").first();
    await editBtn.waitFor({ timeout: 10000 });
    await editBtn.click();

    const nameInput = page.locator("input[type='text']").first();
    const currentName = await nameInput.inputValue();
    await nameInput.fill(currentName);
    await page.locator("button:has-text('Salva')").click();

    const req = await apiCallPromise;
    expect(req.url()).toContain("localhost:8787");
  });
});

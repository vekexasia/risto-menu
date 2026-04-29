/**
 * Admin publish toggle E2E — authenticated.
 *
 * Prerequisites:
 *   1. wrangler dev --remote running on port 8787
 *   2. Next.js dev with NEXT_PUBLIC_API_URL=http://localhost:8787
 *   3. Session saved: npx playwright test --project=auth-setup
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_FILE = path.join(__dirname, "../fixtures/auth.json");
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const hasAuth = fs.existsSync(AUTH_FILE);

test.describe("Admin publish toggle", () => {
  test.skip(!API_URL, "Skipped: NEXT_PUBLIC_API_URL not set");
  test.skip(!hasAuth, "Skipped: run auth-setup first");

  test.use({ storageState: AUTH_FILE });

  test("settings page shows the publish toggle", async ({ page }) => {
    await page.goto("/admin?s=settings");
    await page.waitForLoadState("networkidle");

    // Should not show the login gate
    await expect(
      page.locator("text=Accedi per gestire il ristorante"),
    ).not.toBeVisible({ timeout: 5000 });

    // Either "Pubblica menu" or "Nascondi menu" depending on current state
    const toggle = page.getByRole("button", { name: /pubblica menu|nascondi menu/i });
    await expect(toggle).toBeVisible({ timeout: 10000 });
  });

  test("clicking the publish toggle hits the backend PATCH endpoint", async ({ page }) => {
    await page.goto("/admin?s=settings");
    await page.waitForLoadState("networkidle");

    const apiCallPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/restaurants/") &&
        req.url().includes("/publish") &&
        req.method() === "PATCH",
      { timeout: 15000 },
    );

    const toggle = page.getByRole("button", { name: /pubblica menu|nascondi menu/i });
    await toggle.click();

    const req = await apiCallPromise;
    expect(req.url()).toContain("localhost:8787");
  });

  test("toggle state flips after clicking", async ({ page }) => {
    await page.goto("/admin?s=settings");
    await page.waitForLoadState("networkidle");

    const toggle = page.getByRole("button", { name: /pubblica menu|nascondi menu/i });
    const initialText = (await toggle.textContent())?.trim() ?? "";

    await toggle.click();
    // Wait briefly for the success message / state flip
    await page.waitForTimeout(1500);

    const newText = (await toggle.textContent())?.trim() ?? "";
    expect(newText).not.toBe(initialText);

    // Flip back to leave state unchanged
    await toggle.click();
    await page.waitForTimeout(1500);
  });
});

/**
 * One-time auth setup for admin E2E tests.
 *
 * Run once manually to save your Google sign-in session:
 *   npx playwright test --config=playwright.config.ts --project=auth-setup
 *
 * The session is saved to e2e/fixtures/auth.json (gitignored).
 * Admin tests reuse it — no re-login needed until the session expires (~1 week).
 */

import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_FILE = path.join(__dirname, "auth.json");

setup("authenticate as admin", async ({ page }) => {
  // If a fresh session already exists (< 7 days old), skip.
  if (fs.existsSync(AUTH_FILE)) {
    const age = Date.now() - fs.statSync(AUTH_FILE).mtimeMs;
    if (age < 7 * 24 * 60 * 60 * 1000) {
      console.log("✅ auth.json is fresh — skipping login");
      return;
    }
  }

  console.log(
    "\n🔐 Admin login required. A browser window will open — sign in with Google.\n"
  );

  await page.goto("/admin/categories");

  // Click Google sign-in button
  const googleBtn = page.locator("button", { hasText: /Google/i });
  await googleBtn.waitFor({ timeout: 10000 });
  await googleBtn.click();

  // Wait for successful redirect to admin area (user must complete Google OAuth)
  await page.waitForURL(/\/admin\/categories/, { timeout: 120000 });

  // Verify the admin content is visible (not the login gate)
  await page.locator("h2:has-text('Categorie'), text=Categorie").waitFor({
    timeout: 10000,
  });

  console.log("✅ Logged in. Saving session to auth.json");
  await page.context().storageState({ path: AUTH_FILE });
});

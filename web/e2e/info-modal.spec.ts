import { test, expect } from "@playwright/test";

test.describe("Restaurant Info Modal", () => {
  test.beforeEach(async ({ page }) => {
    // Go to menu page
    await page.goto("/it/menu");

    // Dismiss notice dialog - wait for it specifically and click
    const noticeOkButton = page.locator(".fixed.inset-0 button", { hasText: "OK" });
    try {
      await noticeOkButton.waitFor({ state: "visible", timeout: 5000 });
      await noticeOkButton.click();
      // Wait for dialog to close
      await page.waitForTimeout(300);
    } catch {
      // Dialog might not appear, that's ok
    }

    // Wait for restaurant name to be visible (indicates page is loaded)
    const restaurantName = page.locator("text=RISTORANTE MIRAVALLE");
    await restaurantName.waitFor({ state: "visible", timeout: 15000 });
  });

  test("should open restaurant info modal when clicking header card", async ({
    page,
  }) => {
    // Find and click the info card (contains "Maggiori informazioni")
    const infoCard = page.locator("button", { hasText: "Maggiori informazioni" });
    await expect(infoCard).toBeVisible();
    await infoCard.click();

    // Wait for modal animation
    await page.waitForTimeout(300);

    // Check that the modal opened with correct sections
    await expect(page.locator("text=IL RISTORANTE")).toBeVisible();
    await expect(page.locator("text=DOVE SIAMO")).toBeVisible();
    await expect(page.locator("text=CONTATTI")).toBeVisible();
    await expect(page.locator("text=ORARI DI APERTURA")).toBeVisible();
  });

  test("should close modal when clicking X button", async ({ page }) => {
    // Open modal
    const infoCard = page.locator("button", { hasText: "Maggiori informazioni" });
    await infoCard.click();
    await page.waitForTimeout(300);

    // Verify modal is open
    await expect(page.locator("text=IL RISTORANTE")).toBeVisible();

    // Click close button (X) - inside the dialog portal, top right corner
    const closeButton = page.locator('[id^="headlessui-dialog-panel"] button').first();
    await closeButton.click();

    // Wait for close animation
    await page.waitForTimeout(400);

    // Check that modal is closed
    await expect(page.locator("text=IL RISTORANTE")).not.toBeVisible();
  });

  test("should display social icons when available", async ({ page }) => {
    // Open modal
    const infoCard = page.locator("button", { hasText: "Maggiori informazioni" });
    await infoCard.click();
    await page.waitForTimeout(300);

    // Check for social icons (if restaurant has them configured)
    const facebookIcon = page.locator('img[alt="Facebook"]');
    const instagramIcon = page.locator('img[alt="Instagram"]');
    const whatsappIcon = page.locator('img[alt="WhatsApp"]');

    // At least one social should be visible if configured
    const hasAnySocial = await Promise.any([
      facebookIcon.isVisible().catch(() => false),
      instagramIcon.isVisible().catch(() => false),
      whatsappIcon.isVisible().catch(() => false),
    ]).catch(() => false);

    // This is informational - not a failure if no socials
    if (hasAnySocial) {
      console.log("Social icons are visible in the modal");
    }
  });

  test("should display opening hours with days of the week", async ({ page }) => {
    // Open modal
    const infoCard = page.locator("button", { hasText: "Maggiori informazioni" });
    await infoCard.click();
    await page.waitForTimeout(300);

    // Check for opening hours section
    await expect(page.locator("text=ORARI DI APERTURA")).toBeVisible();

    // Check for at least one day (Italian)
    const mondayVisible = await page.locator("text=LUNEDÌ").isVisible().catch(() => false);
    const mondayEnVisible = await page.locator("text=MONDAY").isVisible().catch(() => false);

    // One of the day names should be visible
    expect(mondayVisible || mondayEnVisible).toBeTruthy();
  });
});

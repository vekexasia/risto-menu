import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/it");
  });

  test("should load the home page and display main content", async ({
    page,
  }) => {
    // Check that the page loads successfully
    await expect(page).toHaveURL(/\/it\/?$/);

    // Check that the main element exists
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display the main header with restaurant name", async ({
    page,
  }) => {
    // Check the header is visible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Check the restaurant name is displayed in the header
    const restaurantName = page.locator("header h1");
    await expect(restaurantName).toBeVisible();
    await expect(restaurantName).toContainText("Ristorante Miravalle");
  });

  test("should display the restaurant subtitle", async ({ page }) => {
    // Check the subtitle text from translations
    const subtitle = page.locator("header p");
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText("IL RISTORANTE");
  });

  test("should display menu selection buttons (SEATED and TAKEAWAY)", async ({
    page,
  }) => {
    // Check that both menu type buttons exist
    const seatedButton = page.getByRole("button", { name: "SEATED" });
    const takeawayButton = page.getByRole("button", { name: "TAKEAWAY" });

    await expect(seatedButton).toBeVisible();
    await expect(takeawayButton).toBeVisible();
  });

  test("should display category tabs", async ({ page }) => {
    // Check that category tabs container exists
    const categoryTabs = page.locator(".flex.gap-2.overflow-x-auto");
    await expect(categoryTabs).toBeVisible();

    // Check that some category items are present
    await expect(page.getByText("Antipasti")).toBeVisible();
    await expect(page.getByText("Primi")).toBeVisible();
    await expect(page.getByText("Secondi")).toBeVisible();
    await expect(page.getByText("Dolci")).toBeVisible();
  });

  test("should display menu items", async ({ page }) => {
    // Check that menu items are displayed
    const menuItems = page.locator(".bg-white.rounded-lg.p-4.shadow-sm");
    await expect(menuItems.first()).toBeVisible();

    // Check that at least one menu item has a price
    const priceElement = page.locator(".text-primary.font-bold").first();
    await expect(priceElement).toBeVisible();
    await expect(priceElement).toContainText("€");
  });

  test("should display footer with restaurant info link", async ({ page }) => {
    // Check that the footer is visible
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Check that the restaurant info link exists
    const infoLink = page.locator('footer a[href="/info"]');
    await expect(infoLink).toBeVisible();
    await expect(infoLink).toContainText("INFO RISTORANTE");
  });

  test("should allow scrolling on the page", async ({ page }) => {
    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Scroll down the page
    await page.evaluate(() => window.scrollBy(0, 200));

    // Wait for scroll to complete
    await page.waitForTimeout(100);

    // Verify scroll position changed
    const newScrollY = await page.evaluate(() => window.scrollY);
    expect(newScrollY).toBeGreaterThan(initialScrollY);
  });

  test("should have proper page structure with semantic HTML", async ({
    page,
  }) => {
    // Check for semantic HTML elements
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("should display menu item descriptions", async ({ page }) => {
    // Check that menu items have descriptions
    const menuItemDescription = page.locator(
      ".bg-white.rounded-lg.p-4.shadow-sm .text-sm.text-gray-500"
    );
    await expect(menuItemDescription.first()).toBeVisible();
  });
});

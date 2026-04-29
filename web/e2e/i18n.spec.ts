import { test, expect } from "@playwright/test";

test.describe("Internationalization (i18n)", () => {
  test.describe("Italian locale (/it)", () => {
    test("should load Italian locale at /it", async ({ page }) => {
      await page.goto("/it");

      // Check URL
      await expect(page).toHaveURL(/\/it\/?$/);

      // Check HTML lang attribute
      const htmlLang = await page.locator("html").getAttribute("lang");
      expect(htmlLang).toBe("it");
    });

    test("should display Italian text on home page", async ({ page }) => {
      await page.goto("/it");

      // Check Italian-specific translations
      await expect(page.getByText("IL RISTORANTE")).toBeVisible();
      await expect(page.getByText("INFO RISTORANTE")).toBeVisible();
    });

    test("should display Italian text on info page", async ({ page }) => {
      await page.goto("/it/info");

      // Check Italian translations
      await expect(page.getByText("INFO RISTORANTE")).toBeVisible();
      await expect(page.getByText("IL RISTORANTE")).toBeVisible();
      await expect(page.getByText("DOVE SIAMO")).toBeVisible();
      await expect(page.getByText("CONTATTI")).toBeVisible();
      await expect(page.getByText("ORARI DI APERTURA")).toBeVisible();
      await expect(page.getByText("Vedi Mappa")).toBeVisible();
      await expect(page.getByText("Chiama")).toBeVisible();
    });

    test("should display Italian day names on info page", async ({ page }) => {
      await page.goto("/it/info");

      // Check Italian day names
      await expect(page.getByText("LUNEDÌ")).toBeVisible();
      await expect(page.getByText("MARTEDÌ")).toBeVisible();
      await expect(page.getByText("MERCOLEDÌ")).toBeVisible();
      await expect(page.getByText("GIOVEDÌ")).toBeVisible();
      await expect(page.getByText("VENERDÌ")).toBeVisible();
      await expect(page.getByText("SABATO")).toBeVisible();
      await expect(page.getByText("DOMENICA")).toBeVisible();
      await expect(page.getByText("CHIUSO")).toBeVisible();
    });
  });

  test.describe("English locale (/en)", () => {
    test("should load English locale at /en", async ({ page }) => {
      await page.goto("/en");

      // Check URL
      await expect(page).toHaveURL(/\/en\/?$/);

      // Check HTML lang attribute
      const htmlLang = await page.locator("html").getAttribute("lang");
      expect(htmlLang).toBe("en");
    });

    test("should display English text on home page", async ({ page }) => {
      await page.goto("/en");

      // Check English-specific translations
      await expect(page.getByText("THE RESTAURANT")).toBeVisible();
      await expect(page.getByText("RESTAURANT INFOS")).toBeVisible();
    });

    test("should display English text on info page", async ({ page }) => {
      await page.goto("/en/info");

      // Check English translations
      await expect(page.getByText("RESTAURANT INFOS")).toBeVisible();
      await expect(page.getByText("THE RESTAURANT")).toBeVisible();
      await expect(page.getByText("LOCATION")).toBeVisible();
      await expect(page.getByText("CONTACTS")).toBeVisible();
      await expect(page.getByText("OPENING HOURS")).toBeVisible();
      await expect(page.getByText("See on the Map")).toBeVisible();
      await expect(page.getByText("Call")).toBeVisible();
    });

    test("should display English day names on info page", async ({ page }) => {
      await page.goto("/en/info");

      // Check English day names
      await expect(page.getByText("MONDAY")).toBeVisible();
      await expect(page.getByText("TUESDAY")).toBeVisible();
      await expect(page.getByText("WEDNESDAY")).toBeVisible();
      await expect(page.getByText("THURSDAY")).toBeVisible();
      await expect(page.getByText("FRIDAY")).toBeVisible();
      await expect(page.getByText("SATURDAY")).toBeVisible();
      await expect(page.getByText("SUNDAY")).toBeVisible();
      await expect(page.getByText("CLOSED")).toBeVisible();
    });
  });

  test.describe("German locale (/de)", () => {
    test("should load German locale at /de", async ({ page }) => {
      await page.goto("/de");

      // Check URL
      await expect(page).toHaveURL(/\/de\/?$/);

      // Check HTML lang attribute
      const htmlLang = await page.locator("html").getAttribute("lang");
      expect(htmlLang).toBe("de");
    });

    test("should display German text on home page", async ({ page }) => {
      await page.goto("/de");

      // Check German-specific translations
      await expect(page.getByText("DAS RESTAURANT")).toBeVisible();
    });

    test("should display German text on info page", async ({ page }) => {
      await page.goto("/de/info");

      // Check German translations (based on de.json)
      await expect(page.getByText("DAS RESTAURANT")).toBeVisible();
      await expect(page.getByText("WO WIR SIND")).toBeVisible();
      await expect(page.getByText("KONTAKTE")).toBeVisible();
      await expect(page.getByText("ÖFFNUNGSZEIT")).toBeVisible();
      await expect(page.getByText("Siehe Karte")).toBeVisible();
      await expect(page.getByText("Anruf")).toBeVisible();
    });
  });

  test.describe("Locale switching", () => {
    test("should maintain same page content structure across locales", async ({
      page,
    }) => {
      // Test Italian
      await page.goto("/it");
      const itSections = await page.locator("main").count();

      // Test English
      await page.goto("/en");
      const enSections = await page.locator("main").count();

      // Test German
      await page.goto("/de");
      const deSections = await page.locator("main").count();

      // All locales should have the same structure
      expect(itSections).toBe(enSections);
      expect(enSections).toBe(deSections);
    });

    test("should have consistent header structure across locales", async ({
      page,
    }) => {
      // Italian
      await page.goto("/it");
      await expect(page.locator("header h1")).toBeVisible();

      // English
      await page.goto("/en");
      await expect(page.locator("header h1")).toBeVisible();

      // German
      await page.goto("/de");
      await expect(page.locator("header h1")).toBeVisible();
    });

    test("info page should have same number of sections across locales", async ({
      page,
    }) => {
      // Italian
      await page.goto("/it/info");
      const itSectionCount = await page.locator("section").count();

      // English
      await page.goto("/en/info");
      const enSectionCount = await page.locator("section").count();

      // German
      await page.goto("/de/info");
      const deSectionCount = await page.locator("section").count();

      // All locales should have the same number of sections
      expect(itSectionCount).toBe(enSectionCount);
      expect(enSectionCount).toBe(deSectionCount);
    });
  });

  test.describe("Default locale behavior", () => {
    test("should redirect root to default locale (Italian)", async ({
      page,
    }) => {
      await page.goto("/");

      // Should redirect to Italian as default
      await expect(page).toHaveURL(/\/(it)?\/?$/);
    });
  });
});

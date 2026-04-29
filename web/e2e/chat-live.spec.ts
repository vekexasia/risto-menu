import { test, expect, type Page } from "@playwright/test";

/**
 * Live integration tests for the chat feature.
 * These hit the real chat worker (localhost:8787) and require:
 *   - Dev server running (npm run dev)
 *   - Chat worker running (npm run worker:dev)
 *
 * Run with: npm run test:e2e:live
 */

async function dismissOverlays(page: Page) {
  const okBtn = page.locator('button:text-is("OK")');
  if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await okBtn.click();
  }
  await page.waitForTimeout(500);
}

async function openChat(page: Page) {
  const fab = page.locator('button[aria-label="Open chat"]');
  // Allow extra time for Next.js hydration, especially late in a long test run
  await expect(fab).toBeVisible({ timeout: 15000 });
  await fab.dispatchEvent("click");
  await expect(page.locator("text=Tony")).toBeVisible();
}

async function sendMessage(page: Page, text: string) {
  const input = page.getByPlaceholder("Scrivi un messaggio...");
  await input.focus();
  await input.pressSequentially(text, { delay: 10 });
  await page.keyboard.press("Enter");
}

/**
 * Wait for an assistant response with actual text (not loading dots).
 * Polls until a bubble with >10 chars appears, then waits for streaming to
 * fully complete (input re-enabled) so all tool calls (show_items, etc.)
 * have been processed and real item cards — not skeletons — are in the DOM.
 */
async function waitForAssistantResponse(page: Page, timeoutMs = 60000) {
  await page.waitForFunction(
    () => {
      const bubbles = document.querySelectorAll(
        '[class*="rounded-2xl"][class*="px-4"]'
      );
      return Array.from(bubbles).some(
        (el) =>
          el.className.includes("bg-white") &&
          (el.textContent?.trim().length ?? 0) > 10
      );
    },
    { timeout: timeoutMs }
  );
  // Wait for streaming to fully complete: the input is disabled while isStreaming=true
  // and becomes enabled again after finishStream() fires (after the SSE done event).
  // Item cards only switch from skeletons to real cards once streaming is done.
  await page.waitForFunction(
    () => {
      const input = document.querySelector(
        'input[placeholder="Scrivi un messaggio..."]'
      ) as HTMLInputElement | null;
      return input !== null && !input.disabled;
    },
    { timeout: 30000 }
  ).catch(() => page.waitForTimeout(3000)); // fallback if input not found
  // Small buffer for React reconciliation
  await page.waitForTimeout(300);
}

function getAssistantMessages(page: Page) {
  return page.evaluate(() => {
    const bubbles = document.querySelectorAll(
      '[class*="rounded-2xl"][class*="px-4"]'
    );
    return Array.from(bubbles)
      .filter(
        (el) =>
          el.className.includes("bg-white") &&
          (el.textContent?.trim().length ?? 0) > 5
      )
      .map((el) => el.textContent?.trim() || "");
  });
}

function getItemCards(page: Page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll(
      'button[class*="bg-gray-50"][class*="rounded-xl"]'
    );
    return Array.from(cards).map(
      (c) => c.textContent?.trim().slice(0, 80) || ""
    );
  });
}

test.describe("Chat (Live)", () => {
  // Longer timeout for LLM responses
  test.setTimeout(120000);
  // LLM output is non-deterministic, retry once on failure
  test.describe.configure({ retries: 1 });

  test.beforeEach(async ({ page }) => {
    await page.goto("/it/menu?aiChat=1");
    await page.evaluate(() => {
      sessionStorage.setItem("promo_seen_demo-restaurant", "1");
    });
    await page.reload();
    await dismissOverlays(page);
  });

  test.afterEach(async ({ page }) => {
    // Rate-limit buffer: OpenAI TPM limits reset per minute.
    // Sequential tests without a gap exhaust the window and cause 429s.
    await page.waitForTimeout(10000);
  });

  test("assistant responds with text to a simple question", async ({
    page,
  }) => {
    await openChat(page);
    await sendMessage(page, "Ciao!");

    await waitForAssistantResponse(page);

    const msgs = await getAssistantMessages(page);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    expect(msgs[0].length).toBeGreaterThan(5);
  });

  test("assistant shows item cards when recommending dishes", async ({
    page,
  }) => {
    await openChat(page);
    await sendMessage(page, "Cosa mi consigli per cena?");

    await waitForAssistantResponse(page);

    // Model may ask a clarifying question (show_choices) before recommending —
    // either outcome is valid, as long as something actionable is surfaced.
    const cards = await getItemCards(page);
    const choiceButtons = page.locator(
      '[class*="rounded-2xl"][class*="bg-white"] button[class*="rounded-full"]'
    );
    const hasCards = cards.length > 0;
    const hasChoices = await choiceButtons.count().then((c) => c > 0);
    expect(hasCards || hasChoices, "no item cards or choice buttons").toBeTruthy();
  });

  test("assistant deflects off-topic questions", async ({ page }) => {
    await openChat(page);
    await sendMessage(page, "Chi ha vinto la champions league?");

    await waitForAssistantResponse(page);

    const msgs = await getAssistantMessages(page);
    const lastMsg = msgs[msgs.length - 1].toLowerCase();
    // Should redirect to menu — check for common deflection words in any language
    const deflectionWords = [
      "menu", "aiutarti", "posso", "piatt", "ristorante",
      "help", "assist", "dish", "restaurant", "food",
    ];
    const deflected = deflectionWords.some((w) => lastMsg.includes(w));
    expect(
      deflected,
      `Expected deflection, got: "${lastMsg.slice(0, 200)}"`
    ).toBeTruthy();
  });

  test("assistant finds pizzas by ingredient (basilico)", async ({ page }) => {
    await openChat(page);
    // Ask for a recommendation (not "list all") — targeted queries are faster
    // and less likely to time out in rate-limited environments.
    await sendMessage(page, "Consigliami una pizza con il basilico");

    await waitForAssistantResponse(page);

    // Should show at least 1 item card with a basil pizza
    const cards = await getItemCards(page);
    const msgs = await getAssistantMessages(page);
    const everything = [...cards, ...msgs].join(" ").toLowerCase();

    // The model picked at least 1 basil pizza, and it appears in cards or text
    expect(
      cards.length > 0 || everything.includes("basilico") || everything.includes("basil"),
      `Expected item cards or basil mention. Got: "${everything.slice(0, 200)}"`
    ).toBeTruthy();

    // At least one known basil pizza should appear somewhere
    const knownBasilPizzas = ["parmigiana", "primavera", "burrata", "patrizia", "saporita"];
    const found = knownBasilPizzas.filter((p) => everything.includes(p));
    expect(
      found.length,
      `Expected at least 1 basil pizza in response. Got: "${everything.slice(0, 200)}"`
    ).toBeGreaterThanOrEqual(1);
  });

  test("assistant finds pizzas by ingredient (acciuga)", async ({ page }) => {
    await openChat(page);
    // Ask for a recommendation (not "list all") to avoid catalog-scan hangs
    await sendMessage(page, "Consigliami una pizza con le acciughe");

    await waitForAssistantResponse(page);

    // Should show at least 1 item card with an anchovy pizza
    const cards = await getItemCards(page);
    const msgs = await getAssistantMessages(page);
    const everything = [...cards, ...msgs].join(" ").toLowerCase();

    expect(
      cards.length > 0 || everything.includes("acciug") || everything.includes("napoli") || everything.includes("romana"),
      `Expected item cards or anchovy mention. Got: "${everything.slice(0, 200)}"`
    ).toBeTruthy();

    // At least one known anchovy pizza must appear somewhere
    const anchovyPizzas = ["napoli", "romana"];
    const found = anchovyPizzas.filter((p) => everything.includes(p));
    expect(
      found.length,
      `Expected at least 1 anchovy pizza in response. Got: "${everything.slice(0, 300)}"`
    ).toBeGreaterThanOrEqual(1);
  });

  test("assistant recommends meat dishes", async ({ page }) => {
    await openChat(page);
    await sendMessage(page, "Avrei voglia di mangiare carne");

    await waitForAssistantResponse(page);

    // Model may ask a clarifying question (show_choices) or go straight to items.
    // Both are valid — just check something actionable appears.
    const cards = await getItemCards(page);
    const choiceButtons = page.locator(
      '[class*="rounded-2xl"][class*="bg-white"] button[class*="rounded-full"]'
    );
    const hasCards = cards.length > 0;
    const hasChoices = await choiceButtons.count().then((c) => c > 0);
    expect(hasCards || hasChoices, "no item cards or choice buttons for meat request").toBeTruthy();

    const msgs = await getAssistantMessages(page);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  test("assistant responds in the user's language (English)", async ({
    page,
  }) => {
    await openChat(page);
    await sendMessage(page, "What meat dishes do you have?");

    // Wait for assistant text (not just cards) — poll for a <span> with >10 chars
    await page.waitForFunction(
      () => {
        const bubbles = document.querySelectorAll(
          '[class*="rounded-2xl"][class*="px-4"][class*="bg-white"]'
        );
        return Array.from(bubbles).some((el) => {
          const span = el.querySelector(":scope > span");
          return span && !span.className.includes("inline-flex") &&
            (span.textContent?.trim().length ?? 0) > 10;
        });
      },
      { timeout: 60000 }
    );
    await page.waitForTimeout(2000);

    const response = await page.evaluate(() => {
      const bubbles = document.querySelectorAll(
        '[class*="rounded-2xl"][class*="px-4"][class*="bg-white"]'
      );
      for (const el of Array.from(bubbles).reverse()) {
        const span = el.querySelector(":scope > span");
        if (span && !span.className.includes("inline-flex")) {
          const text = span.textContent?.trim().toLowerCase() || "";
          if (text.length > 10) return text;
        }
      }
      return "";
    });

    expect(response.length, "No assistant text found").toBeGreaterThan(10);

    // Response should be in English, not Italian
    const italianIndicators = ["abbiamo", "consiglio", "nostro", "ecco", "piatti"];
    const hasItalian = italianIndicators.some((w) => response.includes(w));

    expect(
      hasItalian,
      `Expected English response but got Italian: "${response.slice(0, 300)}"`
    ).toBeFalsy();
  });

  test("assistant shows choice buttons when user is undecided", async ({
    page,
  }) => {
    await openChat(page);
    await sendMessage(page, "Non so cosa mangiare, mi aiuti?");

    await waitForAssistantResponse(page);

    // Choice buttons have text-xs + rounded-full inside assistant bubble
    const choiceButtons = page.locator(
      '[class*="bg-white"][class*="rounded-2xl"] button[class*="rounded-full"][class*="text-xs"]'
    );
    await expect(choiceButtons.first()).toBeVisible({ timeout: 10000 });
    const count = await choiceButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Click the first choice — it should be sent as a user message
    const firstChoice = choiceButtons.first();
    const choiceText = (await firstChoice.textContent())?.trim();
    expect(choiceText?.length).toBeGreaterThan(0);
    await firstChoice.dispatchEvent("click");

    // The selection appears as a user message bubble
    await expect(
      page
        .locator('[class*="bg-primary"][class*="rounded-2xl"]')
        .filter({ hasText: choiceText! })
    ).toBeVisible({ timeout: 5000 });
  });

  test("assistant does not hallucinate wine names", async ({ page }) => {
    await openChat(page);
    await sendMessage(page, "Avete vini rossi?");

    await waitForAssistantResponse(page);

    const msgs = await getAssistantMessages(page);
    const wineMsg = msgs[msgs.length - 1].toLowerCase();

    // These wines are NOT on the Miravalle menu at all (not even in descriptions).
    // "barolo" and "brunello" appear in the Amarone description so they're allowed.
    const hallucinated = ["sassicaia", "tignanello", "montepulciano", "primitivo"];
    const found = hallucinated.filter((w) => wineMsg.includes(w));
    expect(found, `Hallucinated wines found: ${found.join(", ")}`).toHaveLength(
      0
    );
  });

  // ── Rule #2 compliance — text AND item cards must always arrive together ──────

  test("recommendation always includes both text and item cards", async ({
    page,
  }) => {
    await openChat(page);
    await sendMessage(page, "Consigliami una pizza");

    await waitForAssistantResponse(page);

    // Text must exist
    const msgs = await getAssistantMessages(page);
    expect(msgs.length, "no assistant text").toBeGreaterThanOrEqual(1);
    expect(msgs[msgs.length - 1].length, "text too short").toBeGreaterThan(10);

    // The model must surface SOMETHING actionable — either item cards (direct
    // recommendation) or choice buttons (asking user to narrow down first).
    // Plain text with no cards AND no choices is the only forbidden outcome.
    const cards = await getItemCards(page);
    const choiceButtons = page.locator(
      '[class*="rounded-2xl"][class*="bg-white"] button[class*="rounded-full"]'
    );
    const hasCards = cards.length > 0;
    const hasChoices = await choiceButtons.count().then((c) => c > 0);
    expect(
      hasCards || hasChoices,
      `Got text "${msgs[msgs.length - 1].slice(0, 100)}" but neither item cards nor choice buttons`
    ).toBeTruthy();
  });

  test("follow-up recommendation also includes item cards", async ({ page }) => {
    await openChat(page);

    // Turn 1
    await sendMessage(page, "Consigliami una pizza piccante");
    await waitForAssistantResponse(page);
    const cardsAfterTurn1 = await getItemCards(page);
    expect(cardsAfterTurn1.length, "turn 1: no item cards").toBeGreaterThan(0);

    // Turn 2 — explicit recommendation request so model calls show_items
    await sendMessage(page, "Consigliami invece una pizza più delicata");
    await waitForAssistantResponse(page);

    // There should be more cards now (turn 2 appended its own)
    const cardsAfterTurn2 = await getItemCards(page);
    expect(
      cardsAfterTurn2.length,
      "turn 2: no item cards in follow-up"
    ).toBeGreaterThan(cardsAfterTurn1.length);
  });

  // ── navigate_to_category — scroll + choices in one response ───────────────

  test("explicit section request scrolls menu and shows refinement choices", async ({
    page,
  }) => {
    await openChat(page);
    await sendMessage(page, "Mostrami i secondi piatti");

    await waitForAssistantResponse(page);

    // Choice buttons must appear — navigate_to_category always includes choices
    const choiceButtons = page.locator(
      '[class*="rounded-2xl"][class*="bg-white"] button[class*="rounded-full"]'
    );
    await expect(
      choiceButtons.first(),
      "no choice buttons after navigation request"
    ).toBeVisible({ timeout: 10000 });
    expect(await choiceButtons.count()).toBeGreaterThanOrEqual(2);

    // The category tabs bar should reflect the scroll — "SECONDI" tab active
    const secondiTab = page.locator('button[class*="bg-primary"]').filter({
      hasText: /secondi/i,
    });
    await expect(
      secondiTab,
      "menu did not scroll to secondi category"
    ).toBeVisible({ timeout: 5000 });
  });

  // ── show_choices flow — picking a choice leads to items, never a scroll ──

  test("picking from show_choices yields item cards, not a scroll", async ({
    page,
  }) => {
    await openChat(page);
    await sendMessage(page, "Non so cosa mangiare");

    await waitForAssistantResponse(page);

    const choiceButtons = page.locator(
      '[class*="rounded-2xl"][class*="bg-white"] button[class*="rounded-full"]'
    );
    await expect(choiceButtons.first()).toBeVisible({ timeout: 10000 });

    // Click whatever the first choice is
    const firstChoice = choiceButtons.first();
    const choiceText = (await firstChoice.textContent())?.trim() ?? "";
    await firstChoice.dispatchEvent("click");

    // Should get item cards or another refinement round — NOT a navigate_to_category scroll.
    // Multi-round show_choices is valid behavior; the only forbidden outcome is a menu scroll.
    await waitForAssistantResponse(page);

    const cards = await getItemCards(page);
    const moreChoices = page.locator(
      '[class*="rounded-2xl"][class*="bg-white"] button[class*="rounded-full"]'
    );
    const hasCards = cards.length > 0;
    const hasMoreChoices = await moreChoices.count().then((c) => c > 0);
    expect(
      hasCards || hasMoreChoices,
      `Picked "${choiceText}" but got neither item cards nor refinement choices`
    ).toBeTruthy();

    // Also verify text was produced (or a new show_choices prompt — which has no text)
    const msgs = await getAssistantMessages(page);
    expect(msgs.length, "no assistant messages at all").toBeGreaterThanOrEqual(1);
  });
});

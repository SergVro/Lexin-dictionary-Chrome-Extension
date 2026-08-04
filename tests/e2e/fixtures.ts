import { test as base, chromium, BrowserContext, Page } from "@playwright/test";
import path from "path";

/**
 * Path to the built extension (dist folder)
 */
const EXTENSION_PATH = path.resolve(__dirname, "../../dist");

/**
 * Custom test fixtures for Chrome extension testing.
 * 
 * Chrome extensions require a persistent context with the extension loaded.
 * This fixture provides:
 * - `context`: Browser context with the extension loaded
 * - `extensionId`: The ID of the loaded extension
 * - `popupPage`: Helper to open the extension popup
 * - `optionsPage`: Helper to open the extension options page
 * - `historyPage`: Helper to open the extension history page
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  popupPage: () => Promise<Page>;
  optionsPage: () => Promise<Page>;
  historyPage: () => Promise<Page>;
}>({
  // Override the default context to load the extension
  // Playwright throws unless the first argument is an object destructuring pattern.
  // eslint-disable-next-line no-empty-pattern
  // headless and channel come from the config's `use` block, so `--headed` still
  // opens a window for debugging. Both have to be passed through by hand: an
  // extension needs launchPersistentContext, which takes its own options rather
  // than reading the ones Playwright would apply to a browser it launched itself.
  context: async ({ headless, channel }, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel,
      headless,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        // Disable various features for cleaner testing
        "--no-first-run",
        "--disable-default-apps",
        "--disable-popup-blocking",
        "--disable-translate",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-device-discovery-notifications",
      ],
    });
    
    await use(context);
    await context.close();
  },

  // Get the extension ID from the service worker
  extensionId: async ({ context }, use) => {
    // Wait for the service worker to be registered
    let serviceWorker = context.serviceWorkers()[0];
    
    if (!serviceWorker) {
      // Wait for the service worker to appear
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    
    // Extract extension ID from the service worker URL
    // Format: chrome-extension://<extension-id>/scripts/background-main.js
    const extensionId = serviceWorker.url().split("/")[2];
    
    await use(extensionId);
  },

  // Helper to open the popup page
  popupPage: async ({ context, extensionId }, use) => {
    const openPopup = async (): Promise<Page> => {
      const popupUrl = `chrome-extension://${extensionId}/html/popup.html`;
      const page = await context.newPage();
      await page.goto(popupUrl);
      await page.waitForLoadState("domcontentloaded");
      return page;
    };
    
    await use(openPopup);
  },

  // Helper to open the options page
  optionsPage: async ({ context, extensionId }, use) => {
    const openOptions = async (): Promise<Page> => {
      const optionsUrl = `chrome-extension://${extensionId}/html/options.html`;
      const page = await context.newPage();
      await page.goto(optionsUrl);
      await page.waitForLoadState("domcontentloaded");
      return page;
    };
    
    await use(openOptions);
  },

  // Helper to open the history page
  historyPage: async ({ context, extensionId }, use) => {
    const openHistory = async (): Promise<Page> => {
      const historyUrl = `chrome-extension://${extensionId}/html/history.html`;
      const page = await context.newPage();
      await page.goto(historyUrl);
      await page.waitForLoadState("domcontentloaded");
      return page;
    };
    
    await use(openHistory);
  },
});

export { expect } from "@playwright/test";

/**
 * Page object helpers for common extension operations
 */
export class ExtensionHelpers {
  /**
   * Put the extension on a Language Direction before opening any surface.
   *
   * Writes the setting the extension reads rather than driving the Action Popup's
   * language picker, so tests that are not *about* the picker do not break every time
   * it changes - and so a card test does not have to open the popup at all. Same
   * approach the upgrade test uses to rewind storage.
   */
  static async setLanguage(context: BrowserContext, extensionId: string, value: string): Promise<void> {
    // help.html is the cheapest extension page: its script is empty, so nothing runs
    // and nothing races with the write.
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(async (language) => {
      await chrome.storage.local.set({ defaultLanguage: language });
    }, value);
    await page.close();
  }

  /**
   * Put the extension on a translation direction, as the Action Popup's swap control
   * would leave it. Stored as the TranslationDirection number: 1 is "from", 2 is "to".
   */
  static async setTranslationDirection(
    context: BrowserContext, extensionId: string, value: 1 | 2
  ): Promise<void> {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(async (direction) => {
      await chrome.storage.local.set({ translationDirection: direction });
    }, String(value));
    await page.close();
  }

  /**
   * Turn history recording off (or on) without walking the Options page.
   *
   * Stored as the string Settings writes: anything other than "false" means on.
   */
  static async setRecordHistory(
    context: BrowserContext, extensionId: string, value: boolean
  ): Promise<void> {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(async (recording) => {
      await chrome.storage.local.set({ recordHistory: recording });
    }, value ? "true" : "false");
    await page.close();
  }

  /** Reads one settings key back, for assertions about what a surface persisted. */
  static async getStoredValue(
    context: BrowserContext, extensionId: string, key: string
  ): Promise<string | undefined> {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");
    const value = await page.evaluate(async (storageKey) => {
      const stored = await chrome.storage.local.get(storageKey);
      return stored[storageKey];
    }, key);
    await page.close();
    return value;
  }

  /**
   * Put rows in the history store without going near the dictionary services.
   *
   * Keyed exactly as HistoryManager keys them ("history" + langDirection), which is
   * also what its getDirections() reads back to build the History page's tabs.
   */
  static async seedHistory(
    context: BrowserContext,
    extensionId: string,
    byDirection: Record<string, { word: string; translation: string; added: number }[]>
  ): Promise<void> {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(async (seed) => {
      const entries: Record<string, string> = {};
      for (const [direction, items] of Object.entries(seed)) {
        entries["history" + direction] = JSON.stringify(items);
      }
      await chrome.storage.local.set(entries);
    }, byDirection);
    await page.close();
  }

  /**
   * Wait for the Action Popup's language picker to have resolved a language.
   */
  static async waitForLanguagesLoaded(page: Page): Promise<void> {
    await page.waitForFunction(() => {
      const input = document.querySelector('[role="combobox"]') as HTMLInputElement;
      return !!input && input.value.length > 0;
    });
  }

  /**
   * Get the language the Action Popup is currently showing.
   */
  static async getSelectedLanguage(page: Page): Promise<string> {
    return page.locator('[role="combobox"]').inputValue();
  }

  /**
   * Drive the language picker the way a reader would - type, then pick. Use this only
   * where the picker itself is what is under test; use setLanguage otherwise.
   */
  static async pickLanguage(page: Page, text: string): Promise<void> {
    const input = page.locator('[role="combobox"]');
    await input.click();
    await input.fill(text);
    await page.locator('[role="option"]').filter({ hasText: text }).first().click();
  }

  /**
   * Enter a word in the search field
   */
  static async enterWord(page: Page, word: string): Promise<void> {
    await page.fill("#wordInput", word);
  }

  /**
   * Get the translation result
   */
  static async getTranslation(page: Page): Promise<string> {
    return page.locator("#translation").innerText();
  }

  /**
   * Wait for a real translation to appear - not empty, and not one of the
   * placeholders the popup shows first: "Searching..." while a lookup is in
   * flight, or "No word selected" when the popup opened with no page selection.
   */
  static async waitForTranslation(page: Page, timeout = 10000): Promise<void> {
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#translation");
        if (!el) {return false;}
        const text = el.textContent || "";
        return text.length > 0
          && !text.includes("Searching")
          && !text.includes("No word selected");
      },
      { timeout }
    );
  }
}

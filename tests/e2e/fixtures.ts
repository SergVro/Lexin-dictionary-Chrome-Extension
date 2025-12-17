import { test as base, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';

/**
 * Path to the built extension (dist folder)
 */
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

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
  context: async ({ }, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        // Disable various features for cleaner testing
        '--no-first-run',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-translate',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-device-discovery-notifications',
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
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    
    // Extract extension ID from the service worker URL
    // Format: chrome-extension://<extension-id>/scripts/background-main.js
    const extensionId = serviceWorker.url().split('/')[2];
    
    await use(extensionId);
  },

  // Helper to open the popup page
  popupPage: async ({ context, extensionId }, use) => {
    const openPopup = async (): Promise<Page> => {
      const popupUrl = `chrome-extension://${extensionId}/html/popup.html`;
      const page = await context.newPage();
      await page.goto(popupUrl);
      await page.waitForLoadState('domcontentloaded');
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
      await page.waitForLoadState('domcontentloaded');
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
      await page.waitForLoadState('domcontentloaded');
      return page;
    };
    
    await use(openHistory);
  },
});

export { expect } from '@playwright/test';

/**
 * Page object helpers for common extension operations
 */
export class ExtensionHelpers {
  /**
   * Wait for the language dropdown to be populated
   */
  static async waitForLanguagesLoaded(page: Page): Promise<void> {
    await page.waitForFunction(() => {
      const select = document.querySelector('#language') as HTMLSelectElement;
      return select && select.options.length > 0;
    });
  }

  /**
   * Get the currently selected language
   */
  static async getSelectedLanguage(page: Page): Promise<string> {
    return page.locator('#language').inputValue();
  }

  /**
   * Select a language by value
   */
  static async selectLanguage(page: Page, value: string): Promise<void> {
    await page.selectOption('#language', value);
  }

  /**
   * Enter a word in the "From Swedish" input
   */
  static async enterWord(page: Page, word: string): Promise<void> {
    await page.fill('#wordInput', word);
  }

  /**
   * Get the translation result
   */
  static async getTranslation(page: Page): Promise<string> {
    return page.locator('#translation').innerText();
  }

  /**
   * Wait for translation to appear (not empty and not "Searching...")
   */
  static async waitForTranslation(page: Page, timeout = 10000): Promise<void> {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#translation');
        if (!el) return false;
        const text = el.textContent || '';
        return text.length > 0 && !text.includes('Searching');
      },
      { timeout }
    );
  }
}

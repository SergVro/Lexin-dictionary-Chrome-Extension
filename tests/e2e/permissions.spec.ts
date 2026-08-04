import { test, expect } from "./fixtures";
import MessageType from "../../src/scripts/messaging/MessageType";

/**
 * Verifies that the tab-dependent code paths still work under the permission
 * set the extension actually ships (storage only, no "tabs").
 *
 * These paths are otherwise uncovered: the smoke tests open popup.html as a
 * regular tab, so `tabs.query({active: true, currentWindow: true})` inside the
 * popup resolves to the popup's own tab rather than a web page. Combined with
 * ChromeMessageBus.sendMessageToActiveTab only resolving its promise when a
 * response arrives - it neither rejects nor times out - a break in this path
 * is silent and leaves the rest of the suite green.
 */

declare const chrome: any;

const TEST_PAGE = "http://localhost:3456/swedish-text.html";

/** Text of #test-word on the test page, which each test selects. */
const SELECTED_WORD = "bil";

test.describe("Shipped permission surface", () => {

  test("loaded extension requests only the storage and offscreen permissions", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

    // Asserts against the built dist/ manifest as Chrome parsed it, so a
    // stale or hand-edited build is caught too - ManifestTests covers source.
    const manifest = await page.evaluate(() => chrome.runtime.getManifest());

    // offscreen is what lets a pronunciation clip load under the extension's CSP
    // instead of the reader's page. Neither permission warns the user at install.
    // See docs/adr/0004-offscreen-audio-playback.md.
    expect(manifest.permissions).toEqual(["storage", "offscreen"]);
    expect(manifest.web_accessible_resources).toBeUndefined();

    await page.close();
  });

  test('active tab lookup yields an id but no url without the "tabs" permission', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

    const tab = await page.evaluate(() => new Promise<{ id: unknown, url: unknown, error: string | null }>((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => resolve({
        id: tabs[0]?.id ?? null,
        url: tabs[0]?.url ?? null,
        error: chrome.runtime.lastError?.message ?? null
      }));
    }));

    expect(tab.error).toBeNull();
    expect(typeof tab.id).toBe("number");

    // Chrome strips url/title/favIconUrl without "tabs". sendMessageToActiveTab
    // must therefore route on the id alone; a non-null url here means someone
    // re-added the permission, and any code that starts reading tab.url would
    // silently receive undefined once it is removed again.
    expect(tab.url).toBeNull();

    await page.close();
  });

  test("content script answers getSelection over tabs.sendMessage", async ({ context, extensionId }) => {
    const web = await context.newPage();
    await web.goto(TEST_PAGE);
    await web.waitForLoadState("domcontentloaded");
    await web.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector("#test-word")!);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);

    // tab.url is stripped, so the web tab cannot be picked out by URL - probe
    // every tab and keep whatever answers. Tabs without a content script (the
    // extension page, about:blank) report a lastError and resolve to null.
    const responses = await page.evaluate((method) => new Promise<unknown[]>((resolve) => {
      chrome.tabs.query({}, (tabs: any[]) => {
        Promise.all(tabs.map((tab) => new Promise((done) => {
          chrome.tabs.sendMessage(tab.id, { method, args: undefined }, (response: unknown) => {
            void chrome.runtime.lastError;
            done(response ?? null);
          });
        }))).then(resolve);
      });
    }), MessageType.getSelection);

    expect(responses).toContain(SELECTED_WORD);

    await page.close();
    await web.close();
  });
});

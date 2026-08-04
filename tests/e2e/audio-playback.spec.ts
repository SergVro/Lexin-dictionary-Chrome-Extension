import { test, expect, ExtensionHelpers } from "./fixtures";
import type { Page, Worker } from "@playwright/test";

/**
 * Guards the LYSSNA button against the reader's page.
 *
 * The card used to create its own <audio> element, which - in a content script -
 * belongs to the *host page's* document. The clip is then that page's subresource,
 * and any site with a strict default-src blocks it: the button worked in the Action
 * Popup and on plain pages, and came up silent on svt.se. Playback moved into an
 * Offscreen Document, an extension page, where the extension's own policy applies.
 * See docs/adr/0004-offscreen-audio-playback.md.
 *
 * The fixture page carries svt.se's policy in a meta tag. What is asserted is that
 * the clip left the page - no violation, and an Offscreen Document open on the other
 * side - not that a sound came out: Playwright's Chromium ships without the
 * proprietary decoders, so the clip that reaches the document will not decode there.
 */

const CSP_PAGE = "http://localhost:3456/strict-csp.html";

/** Lexin's swe_swe definition of "bil", the fixture's test word. */
const EXPECTED_TRANSLATION = "ett fordon för ett litet antal personer";

/** Alt+Double click the fixture's test word and wait for the card to fill in. */
async function summonCard(page: Page) {
    const testWord = page.locator("#test-word");
    await expect(testWord).toBeVisible();
    const box = await testWord.boundingBox();

    await page.keyboard.down("Alt");
    await page.mouse.dblclick(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.keyboard.up("Alt");

    // Locators pierce the open shadow root the card renders in.
    const content = page.locator(".lexinTranslationContent");
    await expect(content).toBeVisible({ timeout: 15000 });
    await expect(content).toContainText(EXPECTED_TRANSLATION, { timeout: 15000 });
}

/** The Offscreen Documents this extension currently has open, by URL. */
async function offscreenDocuments(worker: Worker): Promise<string[]> {
    const contexts = await worker.evaluate(async () => {
        const found = await chrome.runtime.getContexts({
            contextTypes: ["OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType]
        });
        return found.map((context) => context.documentUrl ?? "");
    });
    return contexts;
}

test.describe("Pronunciation playback", () => {

    test.beforeEach(async ({ context, extensionId }) => {
        // swe_swe both keeps the assertion independent of the stored language and
        // gives the entry a LYSSNA button to click.
        await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");
    });

    test("plays a clip from a page whose CSP forbids it", async ({ context }) => {
        const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
        const page = await context.newPage();

        // Both halves of the old failure. The event is what the page itself sees; the
        // console line is what the reader saw in devtools and reported.
        const violations: string[] = [];
        const consoleErrors: string[] = [];
        page.on("console", (message) => {
            if (message.type() === "error") {
                consoleErrors.push(message.text());
            }
        });
        await page.goto(CSP_PAGE);
        await page.waitForLoadState("domcontentloaded");
        await page.exposeFunction("reportViolation", (blocked: string) => violations.push(blocked));
        await page.evaluate(() => {
            document.addEventListener("securitypolicyviolation",
                (event) => (window as any).reportViolation(event.blockedURI));
        });

        await summonCard(page);
        expect(await offscreenDocuments(worker)).toHaveLength(0);

        await page.locator(".lexinTranslationContent").getByText("LYSSNA").first().click();

        // The document is opened on demand, so its arrival is the proof the click
        // took the new path rather than reaching for an <audio> element in the page.
        await expect.poll(() => offscreenDocuments(worker), { timeout: 10000 })
            .toEqual([expect.stringContaining("/html/offscreen.html")]);

        // Narrowed to the clip rather than "no violation at all": Lexin's markup also
        // carries an <img> from the same host, which this page blocks too. That is a
        // download icon failing to draw, not a feature failing to work.
        expect(violations.filter((blocked) => blocked.includes("/sound/"))).toEqual([]);
        expect(consoleErrors.filter((text) =>
            text.includes("Content Security Policy") && text.includes("/sound/"))).toEqual([]);

        await page.close();
    });

    test("keeps one document for a reader working through several words", async ({ context }) => {
        // Chrome allows a single Offscreen Document per extension and rejects a
        // second createDocument, so a repeated click must find the one already open.
        const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
        const page = await context.newPage();
        await page.goto(CSP_PAGE);
        await page.waitForLoadState("domcontentloaded");
        await summonCard(page);

        const listen = page.locator(".lexinTranslationContent").getByText("LYSSNA").first();
        await listen.click();
        await expect.poll(() => offscreenDocuments(worker), { timeout: 10000 }).toHaveLength(1);
        await listen.click();
        await listen.click();

        expect(await offscreenDocuments(worker)).toHaveLength(1);

        await page.close();
    });
});

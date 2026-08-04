import { test, expect, ExtensionHelpers } from "./fixtures";
import type { BrowserContext, Page, Worker } from "@playwright/test";
import MessageType from "../../src/scripts/messaging/MessageType";

/**
 * The configurable lookup trigger (issue #17), and what these tests cannot prove.
 *
 * Playwright drives Chrome over CDP, which injects input *below* the layer where
 * ChromeOS's Ash and GNOME's Mutter take Alt+click for themselves. The bug this
 * feature exists to fix - a reader on those desktops unable to look a word up at all
 * - is therefore not reproducible here, on any platform.
 *
 * What is testable, and is: that the trigger is configurable, that a non-default
 * modifier works and the default then does not, that a change reaches a tab that is
 * already open, that dismissal is unaffected, that Shift does not drag the selection
 * along behind it, and that the copy tells the reader the truth. The interception
 * itself is verified by hand, on the platform - see docs/adr/0005.
 */

const TEST_PAGE = "http://localhost:3456/swedish-text.html";

/** Where the card's own text lives. Locators pierce the open shadow root. */
const CARD = ".lexinTranslationContent";
const CARD_HOST = ".lexinExtensionMainContainer";

/**
 * Just the word the card was opened on.
 *
 * Not `.lexinCardWord`, which also wraps the flag and the "· sv" language pair -
 * these tests assert the word is one word and nothing else, so the extra text would
 * hide exactly the failure they exist to catch.
 */
const CARD_WORD = ".lexinCardWord > span:not(.lexinCardPair)";

/**
 * Pick a segmented option by its stored value rather than its label.
 *
 * The modifier options are named for the platform - a Mac says Option, not Alt - so
 * filtering on text would make these tests pass or fail by operating system.
 */
async function pickSegValue(page: Page, groupId: string, value: string) {
    await page.locator(`#${groupId} .lxSegOption:has(input[value='${value}'])`).click();
}

/**
 * The extension's service worker, woken if Chrome has let it go to sleep.
 *
 * serviceWorkers() is empty for a dormant MV3 worker, which is ordinary partway
 * through a suite - the same wait the extensionId fixture does.
 */
async function backgroundWorker(context: BrowserContext): Promise<Worker> {
    return context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
}

async function openTestPage(page: Page): Promise<void> {
    await page.goto(TEST_PAGE);
    await page.waitForLoadState("domcontentloaded");
    // The content script is injected at document_end and warms its cache after that.
    await page.waitForTimeout(500);
}

test.describe("Lookup trigger", () => {

    test("options page should persist a chosen modifier", async ({ context, extensionId, optionsPage }) => {
        const page = await optionsPage();

        // Alt is the default, and every existing reader is on it.
        await expect(page.locator("#triggerModifier input[value='alt']")).toBeChecked();

        await pickSegValue(page, "triggerModifier", "shift");
        await expect(page.locator(".lxToast")).toHaveText("Options saved");

        await page.reload();
        await expect(page.locator("#triggerModifier input[value='shift']")).toBeChecked();
        expect(await ExtensionHelpers.getStoredValue(context, extensionId, "triggerModifier"))
            .toBe("shift");
    });

    test("a chosen modifier should open a card where the default no longer does",
        async ({ context, extensionId }) => {
            // The negative half is the point: without it, a test could pass while the
            // setting did nothing and Alt still worked.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

            const page = await context.newPage();
            await openTestPage(page);
            await ExtensionHelpers.triggerLookup(page, "#test-word", { modifier: "Shift" });
            await expect(page.locator(CARD)).toBeVisible();

            const other = await context.newPage();
            await openTestPage(other);
            await ExtensionHelpers.triggerLookup(other, "#test-word", { modifier: "Alt" });
            await expect(other.locator(CARD_HOST)).toHaveCount(0);
        });

    test("a change should reach a tab that is already open", async ({ context, extensionId, optionsPage }) => {
        // The reason the extension has a storage subscription at all. A reader
        // changes the modifier precisely because the current one is intercepted, so
        // the page they were reading can never open a card to re-read it lazily.
        const page = await context.newPage();
        await openTestPage(page);

        const options = await optionsPage();
        await pickSegValue(options, "triggerModifier", "shift");
        await expect(options.locator(".lxToast")).toHaveText("Options saved");

        // Deliberately no reload of `page`.
        await page.bringToFront();
        await ExtensionHelpers.triggerLookup(page, "#test-word", { modifier: "Shift" });
        await expect(page.locator(CARD)).toBeVisible();
    });

    test("Shift should look up the second word, not the span up to it",
        async ({ context, extensionId }) => {
            // Half of the reported defect. Shift+click means "extend the selection
            // from the existing anchor", so after the first lookup the anchor sat on
            // "bil" and the second click selected everything up to "hund".
            //
            // What fixes *this* half is that the double-click path names its word by
            // position rather than by reading the selection - see the dblclick
            // handler. The other half, the selection visibly growing across the page,
            // is the test below.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

            const page = await context.newPage();
            await openTestPage(page);

            await ExtensionHelpers.triggerLookup(page, "#test-word", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("bil");

            await ExtensionHelpers.triggerLookup(page, "#second-word", { modifier: "Shift" });
            const heading = await page.locator(CARD_WORD).textContent();

            expect(heading?.trim()).toBe("hund");
            // Whatever it is, it is one word and not a span of the page.
            expect(heading!.trim().split(/\s+/)).toHaveLength(1);
        });

    test("Shift should not grow the page's own selection", async ({ context, extensionId }) => {
        // The other half, and the one the reader actually sees: even with the right
        // word looked up, Shift+click left the page itself selected from the first
        // word to the last, highlighted in blue across several lines.
        //
        // This is what the mousedown preventDefault is for. Remove it and this fails
        // while the test above still passes, which is why they are separate.
        await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

        const page = await context.newPage();
        await openTestPage(page);

        await ExtensionHelpers.triggerLookup(page, "#test-word", { modifier: "Shift" });
        await ExtensionHelpers.triggerLookup(page, "#second-word", { modifier: "Shift" });

        const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");

        // The prose between the two words runs to well over a hundred characters, so
        // an extended selection is unmistakable; a word is not.
        expect(selected.length).toBeLessThan(20);
        expect(selected).not.toContain("fordon");
    });

    test("position should beat a stale selection", async ({ context }) => {
        // Independent of Shift: a double-click means "the word I am pointing at",
        // whatever the browser happened to have selected beforehand.
        const page = await context.newPage();
        await openTestPage(page);

        await page.evaluate(() => {
            const range = document.createRange();
            range.selectNodeContents(document.querySelector("#test-word") as Node);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        });

        await ExtensionHelpers.triggerLookup(page, "#second-word");
        await expect(page.locator(CARD_WORD)).toHaveText("hund");
    });

    test("a plain click should still dismiss the card", async ({ context, extensionId }) => {
        // The click listener does double duty - trigger and dismiss-on-click-out -
        // and only this notices if the trigger check swallows the dismissal.
        await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

        const page = await context.newPage();
        await openTestPage(page);
        await ExtensionHelpers.triggerLookup(page, "#test-word", { modifier: "Shift" });
        await expect(page.locator(CARD)).toBeVisible();

        await page.mouse.click(5, 5);
        await expect(page.locator(CARD_HOST)).toHaveCount(0);
    });

    test("the keyboard command should be declared and should translate a selection",
        async ({ context, page }) => {
            const worker = await backgroundWorker(context);

            const commands = await worker.evaluate(async () => {
                return await chrome.commands.getAll();
            });
            const translate = commands.find((c: any) => c.name === "translate-selection");
            expect(translate).toBeTruthy();
            expect(translate.description).toBe("Translate the selected word");

            await openTestPage(page);
            await page.evaluate(() => {
                const range = document.createRange();
                range.selectNodeContents(document.querySelector("#test-word") as Node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            });

            // Chrome's own dispatch of the keystroke to onCommand is the one link
            // this cannot cover: page.keyboard.press goes to the renderer, and a
            // browser-level extension shortcut never reaches it. Everything from the
            // worker's handler onwards is exercised here.
            await worker.evaluate(async (method) => {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tabs[0].id!, { method });
            }, MessageType.translateSelection);

            await expect(page.locator(CARD_WORD)).toHaveText("bil");
        });

    test("the keyboard command should do nothing with no selection", async ({ context, page }) => {
        // A panel opening on a keystroke that found no word is a surprise, not a
        // help - and on a chrome:// page no frame answers at all.
        const worker = await backgroundWorker(context);
        await openTestPage(page);

        await worker.evaluate(async (method) => {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tabs[0].id!, { method });
        }, MessageType.translateSelection);

        await page.waitForTimeout(500);
        await expect(page.locator(CARD_HOST)).toHaveCount(0);
    });

    test("the copy should name the modifier the reader chose", async ({ context, extensionId, popupPage }) => {
        await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

        const help = await context.newPage();
        await help.goto(`chrome-extension://${extensionId}/html/help.html`);
        await expect(help.locator("#stepDoubleClick")).toHaveText("Shift + double-click a word");
        await expect(help.locator("#stepClick")).toHaveText("Select, then Shift + click");

        const popup = await popupPage();
        await expect(popup.locator("#translation")).toContainText("Shift + double-click a word");
    });
});

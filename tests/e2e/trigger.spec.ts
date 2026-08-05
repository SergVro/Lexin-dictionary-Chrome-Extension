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
/** Markup that splits or runs words together, and a linked word. Kept compact and
 *  separate so every target stays inside the viewport. */
const BOUNDARIES_PAGE = "http://localhost:3456/word-boundaries.html";
/** Text inside shadow roots, as a page built out of web components keeps it. */
const SHADOW_PAGE = "http://localhost:3456/shadow-text.html";

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

async function openTestPage(page: Page, url: string = TEST_PAGE): Promise<void> {
    await page.goto(url);
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

    test("a word split across inline elements should come back whole", async ({ context }) => {
        // `h<em>u</em>nd` renders as one word and a reader double-clicks it as one,
        // but it is three text nodes. Naming the word from the node under the pointer
        // alone returns a fragment - "u" or "nd".
        const page = await context.newPage();
        await openTestPage(page, BOUNDARIES_PAGE);

        await ExtensionHelpers.triggerLookup(page, "#split-word");

        await expect(page.locator(CARD_WORD)).toHaveText("hund");
    });

    test("a split word should come back whole under Shift too", async ({ context, extensionId }) => {
        // Shift takes the other branch: its selection is suppressed, so the browser's
        // is not there to fall back on and wordAtPoint has to name the word by
        // itself. Pages split words whenever they emphasise or highlight part of one,
        // which is most words on a page of search results.
        await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

        const page = await context.newPage();
        await openTestPage(page);

        await ExtensionHelpers.triggerLookup(page, "#split-word", { modifier: "Shift" });

        await expect(page.locator(CARD_WORD)).toHaveText("hund");
    });

    test("markup that runs words together should still name one word",
        async ({ context, extensionId }) => {
            // A line break and a nested block both carry no text of their own.
            // Eliding them while flowing the surrounding text together reads
            // `bil<br>hund` as `bilhund` and looks that up - a word not on the page.
            //
            // Under Shift, deliberately: that is the branch which names the word by
            // position. Alt would defer to the browser's own selection and never
            // reach the code under test.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

            const page = await context.newPage();
            await openTestPage(page, BOUNDARIES_PAGE);

            await ExtensionHelpers.triggerLookup(page, "#break-before", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("bil");

            await ExtensionHelpers.triggerLookup(page, "#break-after", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("hund");

            await ExtensionHelpers.triggerLookup(page, "#block-after", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("hund");
        });

    test("an icon between words should separate them, an empty wrapper should not",
        async ({ context, extensionId }) => {
            // An <img> carries no text but takes up room, so `bil<img>hund` is two
            // words - collecting it as `bilhund` would look up a word that is not on
            // the page. An empty <span> renders nothing, so the word around it is
            // still one word, and treating every textless element as a separator
            // would break it.
            //
            // Under Shift, which is the branch that names the word by position.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

            const page = await context.newPage();
            await openTestPage(page, BOUNDARIES_PAGE);

            await ExtensionHelpers.triggerLookup(page, "#icon-before", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("bil");

            await ExtensionHelpers.triggerLookup(page, "#icon-after", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("hund");

            await ExtensionHelpers.triggerLookup(page, "#empty-wrap", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("hund");

            // An accessible SVG icon has text - its <title> - and none of it is on
            // the page. Reading textContent would flow this as "bilikonhund".
            await ExtensionHelpers.triggerLookup(page, "#svg-before", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("bil");

            await ExtensionHelpers.triggerLookup(page, "#svg-after", { modifier: "Shift" });
            await expect(page.locator(CARD_WORD)).toHaveText("hund");
        });

    test("a hidden element should separate nothing", async ({ context, extensionId }) => {
        // A hidden element renders no box, so it does not split the visible word -
        // and its text is not on the page either, so it must not join it. Both are
        // easy to get wrong in opposite directions: `display: none` fails every test
        // for flowing inline, so it reads as a block unless it is skipped first.
        //
        // Under Shift, which is the branch that names the word by position.
        await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

        const page = await context.newPage();
        await openTestPage(page, BOUNDARIES_PAGE);

        await ExtensionHelpers.triggerLookup(page, "#hidden-attr", { modifier: "Shift" });
        await expect(page.locator(CARD_WORD)).toHaveText("hund");

        await ExtensionHelpers.triggerLookup(page, "#hidden-css", { modifier: "Shift" });
        await expect(page.locator(CARD_WORD)).toHaveText("hund");
    });

    test("a word inside a web component should be found by position",
        async ({ context, extensionId }) => {
            // Neither caret API descends into a shadow tree unasked, so naming a word
            // by position used to fail outright on any page built out of web
            // components - which is most text on a lot of sites.
            //
            // Under Shift, the branch with no browser selection to fall back on and
            // therefore the one that has to reach in.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

            const page = await context.newPage();
            await openTestPage(page, SHADOW_PAGE);

            await ExtensionHelpers.triggerLookup(page, "#shadow-word", { modifier: "Shift" });

            await expect(page.locator(CARD_WORD)).toHaveText("bil");
        });

    test("a word inside a web component should still work on the default trigger",
        async ({ context }) => {
            // Alt reads the browser's own selection first, which has always pierced
            // shadow roots. Here to keep it that way.
            const page = await context.newPage();
            await openTestPage(page, SHADOW_PAGE);

            await ExtensionHelpers.triggerLookup(page, "#shadow-word");

            await expect(page.locator(CARD_WORD)).toHaveText("bil");
        });

    test("a trigger click should have the page's default suppressed", async ({ context }) => {
        // The click path used to return before suppressing the default whenever there
        // was no selection yet - which is exactly the first click of a double-click on
        // a word. Every trigger does something to a link on that click: Ctrl+click
        // opens a background tab, Alt+click downloads, Shift+click opens a window.
        //
        // Asserted on the event rather than on the consequence, because the
        // consequence differs by modifier and by platform, and two of the three are
        // not observable here at all. defaultPrevented is the fix itself.
        const page = await context.newPage();
        await openTestPage(page, BOUNDARIES_PAGE);

        // Registered after the content script's, so it sees the flag as the browser
        // will when it decides what to do next.
        await page.evaluate(() => {
            (window as any).__prevented = [];
            document.addEventListener("click", (e) => {
                (window as any).__prevented.push(e.defaultPrevented);
            });
        });

        // A single click with nothing selected: the case that used to slip through.
        await ExtensionHelpers.triggerLookup(page, "#break-after", { gesture: "click" });

        expect(await page.evaluate(() => (window as any).__prevented)).toEqual([true]);
    });

    test("Shift should ignore a selection the reader clicked away from",
        async ({ context, extensionId }) => {
            // The other side of the select-then-click flow, and the precise reason the
            // click path checks where the click landed. With a selection lying around,
            // a Shift click elsewhere is the first half of a double-click aimed at
            // another word - looking the old selection up would open a card for a word
            // the reader chose some time ago and file a history entry for it.
            //
            // A single click rather than a double: it isolates the click path, and
            // the card it wrongly opens is not dismissed a moment later by the
            // double-click's own.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

            const page = await context.newPage();
            await openTestPage(page);

            await page.evaluate(() => {
                const range = document.createRange();
                range.selectNodeContents(document.querySelector("#test-word") as Node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            });

            await ExtensionHelpers.triggerLookup(page, "#second-word",
                { modifier: "Shift", gesture: "click" });

            await page.waitForTimeout(1000);
            await expect(page.locator(CARD_HOST)).toHaveCount(0);
        });

    test("Shift should still look up a selection the reader clicks on",
        async ({ context, extensionId }) => {
            // The select-then-click flow, which the help page offers whatever the
            // trigger. Clicking *on* the selection is what separates it from the
            // first half of a double-click aimed elsewhere, so it has to keep working.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");

            const page = await context.newPage();
            await openTestPage(page);

            await page.evaluate(() => {
                const range = document.createRange();
                range.selectNodeContents(document.querySelector("#test-word") as Node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            });

            await ExtensionHelpers.triggerLookup(page, "#test-word",
                { modifier: "Shift", gesture: "click" });

            await expect(page.locator(CARD_WORD)).toHaveText("bil");
        });

    test("a double-click should look a word up once, not twice",
        async ({ context, extensionId }) => {
            // A double-click arrives as click, click, dblclick, and the second click
            // reached the lookup too - so one gesture made two dictionary requests
            // and filed two identical history entries.
            //
            // Counted in history rather than in cards: each lookup dismisses the card
            // before opening its own, so a duplicate leaves exactly one card behind
            // and is invisible from the page.
            //
            // History is the only witness. Its writes are serialized, so every
            // completed lookup is represented and a duplicate cannot hide behind a
            // later write.
            await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");
            await ExtensionHelpers.seedHistory(context, extensionId, { swe_swe: [] });

            const page = await context.newPage();
            await openTestPage(page);

            await ExtensionHelpers.triggerLookup(page, "#test-word");
            await expect(page.locator(CARD_WORD)).toHaveText("bil");
            // Long enough for a second lookup to have been written.
            await page.waitForTimeout(1500);

            const stored = await ExtensionHelpers.getStoredValue(context, extensionId, "historyswe_swe");
            const entries = JSON.parse(stored || "[]") as { word: string }[];

            expect(entries.filter((entry) => entry.word === "bil")).toHaveLength(1);
        });

    test("Shift should look up the pointed word with a selection lying around",
        async ({ context, extensionId }) => {
            // End to end for the case the click gate exists to protect: a selection
            // from earlier, and a double-click somewhere else. The word that wins is
            // the one under the pointer.
            //
            // The final card proves which lookup won visually; serialized history
            // also proves a spurious lookup of the existing selection never happened.
            await ExtensionHelpers.setTriggerModifier(context, extensionId, "shift");
            await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");
            await ExtensionHelpers.seedHistory(context, extensionId, { swe_swe: [] });

            const page = await context.newPage();
            await openTestPage(page);

            await page.evaluate(() => {
                const range = document.createRange();
                range.selectNodeContents(document.querySelector("#test-word") as Node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            });

            await ExtensionHelpers.triggerLookup(page, "#second-word", { modifier: "Shift" });

            await expect(page.locator(CARD_WORD)).toHaveText("hund");

            const stored = await ExtensionHelpers.getStoredValue(context, extensionId, "historyswe_swe");
            const entries = JSON.parse(stored || "[]") as { word: string }[];
            expect(entries.some((entry) => entry.word === "hund")).toBe(true);
            expect(entries.some((entry) => entry.word === "bil")).toBe(false);
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

    test("the keyboard command should open one card when a frame is focused",
        async ({ context }) => {
            // Both documents keep a selection and both report hasFocus - the top one
            // because focus is on its chain, via the iframe. Without naming the
            // deepest focused frame, both answer: two cards, two lookups, two history
            // entries, from one keystroke.
            const page = await context.newPage();
            const worker = await backgroundWorker(context);

            await page.goto("http://localhost:3456/framed-text.html");
            await page.waitForLoadState("domcontentloaded");
            await page.waitForTimeout(700);

            // Select a word in the top document first, then one inside the frame -
            // leaving the top document's selection alive but no longer focused.
            await page.evaluate(() => {
                const range = document.createRange();
                range.selectNodeContents(document.querySelector("#outer-word") as Node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            });

            const frame = page.frameLocator("#inner");
            await frame.locator("#second-word").click();
            await page.frames()[1].evaluate(() => {
                const range = document.createRange();
                range.selectNodeContents(document.querySelector("#second-word") as Node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            });

            await worker.evaluate(async (method) => {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tabs[0].id!, { method });
            }, MessageType.translateSelection);

            await expect(frame.locator(CARD_WORD)).toHaveText("hund");
            // The top document, whose selection is stale, must have stayed quiet.
            await expect(page.locator(CARD_HOST)).toHaveCount(0);
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

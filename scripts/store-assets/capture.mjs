/*
 * Regenerates every Chrome Web Store asset from the built extension: the five
 * screenshots, and the two promotional tiles.
 *
 *     npm run store-assets
 *
 * Every picture is of the real extension, driven the way a reader drives it: the
 * Translation Card is summoned by an actual Alt+double-click on an actual page, and
 * the entries in it come from the live dictionary services - as do the translations
 * printed on the promo tiles. Nothing here is a mockup, so an asset cannot quietly
 * outlive the interface it claims to show: if a surface changes shape, this script's
 * captures change with it or it fails outright.
 *
 * The two things it does stage are the reader's own data, because a fresh profile has
 * none: the stored settings and the history rows are written straight into
 * chrome.storage, the same way the E2E fixtures do it. The third is the platform, for
 * one capture only - see captureTrigger.
 *
 * Output: docs/store-assets/{screenshots,promo}/*.png, all 24-bit and free of alpha.
 */

import { chromium } from "@playwright/test";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describePng } from "./png.mjs";
import { writeAsset, dataUri } from "./asset.mjs";
import { tileHtml, TILE } from "./tile.mjs";
import {
    smallPromoHtml, marqueePromoHtml, SMALL, MARQUEE, PROMO_WORD, MARQUEE_LANGUAGES
} from "./promo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(HERE, "../../dist");
const PAGES_PATH = path.join(HERE, "pages");
const ICON_PATH = path.resolve(HERE, "../../src/icons/icon128.png");
const OUTPUT_PATH = path.resolve(HERE, "../../docs/store-assets");

/** Content scripts only run on http(s), so the article page needs a real origin. */
const PORT = 3457;

/**
 * Captures are taken at 2x and drawn at no more than their captured CSS size on the
 * tile, which keeps text on whole device pixels instead of resampling it soft.
 */
const SCALE = 2;

const DICTIONARY_TIMEOUT = 20000;

/** The window of the article page that the card is photographed inside. */
const CARD_CLIP = { width: 900, height: 560 };

/**
 * The word the card and the popup both look up.
 *
 * Chosen for the shape of its entry, not its meaning: one sense, with pronunciation,
 * inflections and a definition, which is enough to look like a dictionary and still
 * fits inside the card's 480px max-height. A longer entry - "avgång", "beslut" and
 * most other words in this article - fills the card to its limit and is cut off
 * mid-line, which in a still picture reads as a broken layout rather than as the
 * scrollable region it is.
 */
const CARD_WORD = "fordon";

/**
 * The Action Popup gets a shorter word than the card does, because it has far less
 * room: the entry sits in a flex child roughly 190px tall, under the search row and
 * the language picker and above the recent chips, and scrolls. "katt" is one of the
 * few entries that arrives complete inside that - most run to several hundred pixels
 * and would be cut mid-sentence, which is honest about the scrolling but looks like a
 * broken layout in a still picture.
 */
const POPUP_WORD = "katt";

/**
 * History rows, per Language Direction, keyed as HistoryManager keys them.
 *
 * Three directions so the History page has something to put in its tabs, and dates
 * spread over three days so the date column shows its grouping rather than repeating
 * one date down the page.
 */
const DAY = 86400000;
const TODAY = Date.parse("2026-08-02T09:00:00Z");

const HISTORY = {
    swe_eng: [
        { word: "framtid", translation: "future", added: TODAY },
        { word: "avgång", translation: "departure", added: TODAY - 3600000 },
        { word: "tidtabell", translation: "timetable", added: TODAY - 7200000 },
        { word: "pendla", translation: "commute", added: TODAY - DAY },
        { word: "underhåll", translation: "maintenance", added: TODAY - DAY - 3600000 },
        { word: "fordon", translation: "vehicle", added: TODAY - DAY - 7200000 },
        { word: "punktlighet", translation: "punctuality", added: TODAY - 2 * DAY },
        { word: "resenär", translation: "traveller", added: TODAY - 2 * DAY - 3600000 },
        { word: "beslut", translation: "decision", added: TODAY - 2 * DAY - 7200000 },
        { word: "hastighet", translation: "speed", added: TODAY - 3 * DAY }
    ],
    swe_ukr: [
        { word: "framtid", translation: "майбутнє", added: TODAY - DAY },
        { word: "tåg", translation: "потяг", added: TODAY - 2 * DAY },
        { word: "resa", translation: "подорож", added: TODAY - 2 * DAY - 3600000 }
    ],
    swe_spa: [
        { word: "tidtabell", translation: "horario", added: TODAY - DAY },
        { word: "vagn", translation: "vagón", added: TODAY - 3 * DAY }
    ]
};

const COPY = {
    card: {
        eyebrow: "On any page",
        headline: "Alt+double-click a Swedish word",
        subhead: "The translation appears over the text you are reading — no new tab, "
            + "no copy-paste, no losing your place."
    },
    popup: {
        eyebrow: "From the toolbar",
        headline: "Or type the word yourself",
        subhead: "One search box, with a button to swap the direction and translate "
            + "from your language back into Swedish. Pronunciation included where "
            + "the dictionary has it."
    },
    history: {
        eyebrow: "History",
        headline: "Every word you look up, saved",
        subhead: "Kept separately per language and searchable. Export the ones you tick "
            + "as Quizlet-ready TSV, Anki .txt, CSV, or to the clipboard."
    },
    options: {
        eyebrow: "Options",
        headline: "22 dictionaries. Show only the ones you use.",
        subhead: "Choose which languages appear in the picker, which one is the default, "
            + "and whether the extension follows light, dark or your system appearance."
    },
    // Framed as the fix for a reader who cannot look a word up at all, because that is
    // who this setting exists for. A headline naming the setting would be read by the
    // people who already have a working Alt key and skipped by the ones who do not.
    trigger: {
        eyebrow: "Options",
        headline: "Alt taken? Look words up with Ctrl or Shift.",
        // The picture carries the reason - the hint under the control names ChromeOS
        // and Linux - so the subhead says what a reader can do instead of repeating it
        // two inches above itself.
        subhead: "The key is yours to set. Or bind a keyboard shortcut and look a word up "
            + "with no mouse at all: no desktop can take that one for itself."
    },
    // The promo tiles are often drawn small, so their copy is shorter than the tiles
    // above and says one thing each.
    small: {
        subhead: "Swedish into 22 languages, right on the page you are reading."
    },
    marquee: {
        headline: "Swedish, translated where you are reading it",
        subhead: "Alt+double-click any word on any page. 22 dictionaries "
            + "from Lexin and Folkets Lexikon."
    }
};

/** Serves scripts/store-assets/pages, so the content script has an origin to run on. */
function startPageServer() {
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".png": "image/png" };
    const server = http.createServer(async (request, response) => {
        const name = path.basename(new URL(request.url, "http://localhost").pathname);
        try {
            const body = await fs.readFile(path.join(PAGES_PATH, name));
            response.writeHead(200, { "Content-Type": types[path.extname(name)] || "text/plain" });
            response.end(body);
        } catch {
            response.writeHead(404).end("not found");
        }
    });
    return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

/**
 * Writes the reader's stored state.
 *
 * help.html is the cheapest extension page to do it from - its script is empty, so
 * nothing races with the write. Same trick as tests/e2e/fixtures.ts.
 */
async function primeStorage(context, extensionId) {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(async (seed) => {
        const entries = {
            defaultLanguage: "swe_eng",
            // 2 is TranslationDirection.to - the direction that reads Swedish in.
            translationDirection: "2",
            recordHistory: "true",
            appearance: "light"
        };
        for (const [direction, rows] of Object.entries(seed)) {
            entries["history" + direction] = JSON.stringify(rows);
        }
        await chrome.storage.local.set(entries);
    }, HISTORY);
    await page.close();
}

/** Resolves once a translation area holds a real entry rather than a placeholder. */
async function waitForEntry(page, selector) {
    await page.waitForFunction((sel) => {
        const el = document.querySelector(sel)
            // The card lives in a shadow root, which querySelector does not enter.
            || document.querySelector(".lexinExtensionMainContainer")?.shadowRoot?.querySelector(sel);
        const text = el?.textContent ?? "";
        return text.length > 0 && !text.includes("Searching") && !text.includes("No word selected");
    }, selector, { timeout: DICTIONARY_TIMEOUT });
}

/**
 * The Translation Card, photographed where it belongs: over the page it was summoned
 * from. The clip keeps enough of the article around it to show that the card is
 * floating over someone else's typography, not replacing it.
 */
async function captureCard(context) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}/article.html`);
    await page.waitForLoadState("networkidle");

    const word = page.locator("#target-word");
    const clicked = (await word.innerText()).trim();
    if (clicked !== CARD_WORD) {
        throw new Error(`article.html marks "${clicked}" as the word to click, not "${CARD_WORD}" - `
            + "one of the two has moved, and the entry may no longer fit the card");
    }
    const box = await word.boundingBox();
    await page.keyboard.down("Alt");
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.up("Alt");

    // Locators pierce open shadow roots; document.querySelector does not.
    await page.locator(".lexinTranslationContent").waitFor({ state: "visible", timeout: DICTIONARY_TIMEOUT });
    await waitForEntry(page, ".lexinTranslationContent");
    // The card repositions itself once the entry has landed and it knows its height.
    await page.waitForTimeout(600);

    // A fixed landscape window rather than a margin around the card: the tile below is
    // landscape, so a crop that merely hugged the card would have to be scaled down to
    // fit and would take the article down with it. This keeps a column of the page
    // either side, which is the whole point of the picture.
    //
    // Horizontally the card is centred; vertically it sits high, because the word that
    // was double-clicked - still selected, and the one thing that explains the
    // picture - is below the card, and the foot of this crop is what bleeds off the
    // bottom of the tile.
    const card = await page.locator(".lexinTranslationContainer").boundingBox();
    const clamp = (value, max) => Math.max(0, Math.min(value, max));
    const clip = {
        x: clamp(card.x + card.width / 2 - CARD_CLIP.width / 2, 1280 - CARD_CLIP.width),
        y: clamp(card.y - 80, 800 - CARD_CLIP.height),
        ...CARD_CLIP
    };

    const shot = await page.screenshot({ clip });
    await page.close();
    return shot;
}

/** The Action Popup, at the width Chrome gives it. */
async function capturePopup(context, extensionId) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 380, height: 640 });
    await page.goto(`chrome-extension://${extensionId}/html/popup.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => {
        const input = document.querySelector('[role="combobox"]');
        return !!input && input.value.length > 0;
    });

    await page.fill("#wordInput", POPUP_WORD);
    await page.press("#wordInput", "Enter");
    await waitForEntry(page, "#translation");
    // The popup autofocuses its input, and the focus ring is a 2px accent border. Left
    // on, it is the loudest thing in the picture and reads as an error state.
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(400);

    const shot = await page.screenshot({ clip: await page.locator("body").boundingBox() });
    await page.close();
    return shot;
}

/** An extension page at a window size that suits its content. */
async function capturePage(context, extensionId, file, size, prepare) {
    const page = await context.newPage();
    await page.setViewportSize(size);
    await page.goto(`chrome-extension://${extensionId}/html/${file}`);
    await page.waitForLoadState("domcontentloaded");
    const clip = prepare ? await prepare(page) : undefined;
    await page.waitForTimeout(500);
    const shot = await page.screenshot(clip ? { clip } : undefined);
    await page.close();
    return shot;
}

/**
 * Ticks a few rows and opens the export menu, so the History page in the picture is
 * one a reader is doing something with. The listing's claim is that the words you
 * tick can be exported to Quizlet or Anki, and this is the frame where that claim is
 * visible rather than asserted: the count reads "3 selected" and the formats are on
 * screen.
 */
async function stageHistory(page) {
    const rows = page.locator("#history tbody input[type=\"checkbox\"]");
    for (const index of [0, 1, 3]) {
        await rows.nth(index).check();
    }
    await page.locator("#exportButton").click();
    await page.locator("#exportMenu").waitFor({ state: "visible" });
}

/**
 * The Settings block at the foot of the Options page, cut out on its own.
 *
 * It goes on the Options tile as an inset. Twenty-two language rows stand between the
 * top of that page and its Appearance control, so a single frame either shows the
 * languages the headline is about or shows the setting the subhead promises, never
 * both.
 */
async function stageSettings(page) {
    await page.locator("#appearance").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // The Appearance control alone, not the whole Settings block, and the width is
    // taken from the control rather than from its label: the label is a block and runs
    // the full width of the field, so a box drawn round both would be mostly empty
    // space, with the type in it too small to read once the inset is scaled down.
    const label = await page.locator("#appearanceLabel").boundingBox();
    const control = await page.locator("#appearance").boundingBox();
    const pad = 22;
    const top = label.y - 14;
    return {
        x: control.x - pad,
        y: top,
        width: control.width + pad * 2,
        height: control.y + control.height + pad - top
    };
}

/**
 * The Settings block, down as far as the modifier control, as a Windows or Linux
 * reader sees it.
 *
 * This is the one capture that stages the platform, and it has to. The Options page
 * asks the browser which modifiers this desktop can deliver at all, and on a Mac the
 * answer is Option and Shift: macOS defines Ctrl+click as the secondary click, so the
 * gesture could never fire there, and the page is honest about it rather than offering
 * a key that does nothing (docs/adr/0005-configurable-lookup-trigger.md). Photographed
 * from a Mac, the picture would print Mac key names for a store audience that is
 * mostly not on one, and would hide Ctrl from precisely the ChromeOS readers the
 * setting was built for. Overriding the platform makes the page take the branch those
 * readers get; it is still the built extension deciding, from an answer it was given.
 *
 * The keyboard shortcut field is left below the crop deliberately. Chrome reports the
 * binding it really holds, which on this machine is the Mac one, and a Command key
 * under a row reading Alt/Ctrl/Shift would be a picture of a browser that exists
 * nowhere.
 */
async function captureTrigger(context, extensionId) {
    const page = await context.newPage();
    // Narrower than the other Options capture, and that is what puts the Settings grid
    // into a single column: it is auto-fit at minmax(280px, 1fr), so two columns need
    // 584px of content and this window has 572. One column is what stacks the modifier
    // control under the two settings above it, and what leaves the keyboard shortcut
    // field below the crop rather than sliced down its middle beside it.
    await page.setViewportSize({ width: 620, height: 800 });
    await page.addInitScript(() => {
        // Both, because onMac() prefers userAgentData and falls back to platform.
        Object.defineProperty(navigator, "platform", { get: () => "Win32" });
        Object.defineProperty(navigator, "userAgentData", { get: () => ({ platform: "Windows" }) });
    });
    await page.goto(`chrome-extension://${extensionId}/html/options.html`);
    await page.waitForLoadState("domcontentloaded");

    const options = page.locator("#triggerModifier .lxSegOption");
    await options.first().waitFor();
    // textContent, not innerText: the control is uppercased in CSS, and innerText
    // reports what is rendered, so this would be comparing against ALT/CTRL/SHIFT.
    const labels = (await options.allTextContents()).map((label) => label.trim());
    if (labels.join() !== "Alt,Ctrl,Shift") {
        throw new Error(`The modifier control rendered ${labels.join("/") || "nothing"}, not `
            + "Alt/Ctrl/Shift - either the platform override no longer reaches onMac(), or "
            + "availableModifiers() offers a different set");
    }

    await page.locator(".lxSettings").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Heading down to the foot of the modifier field: the picture reads as the Settings
    // block rather than as a control floating on its own, and shows that the key is
    // chosen in the same place as everything else about the extension.
    const heading = await page.locator(".lxSectionTitle").boundingBox();
    const settings = await page.locator(".lxSettings").boundingBox();
    const field = await page.locator(".lxField:has(#triggerModifier)").boundingBox();
    const shortcut = await page.locator(".lxField:has(#openShortcuts)").boundingBox();

    const foot = field.y + field.height;
    if (shortcut.y < foot) {
        throw new Error("The keyboard shortcut field sits beside the modifier field rather than "
            + "below it, so this crop would slice it down the middle - the Settings grid is no "
            + "longer in one column at this width");
    }

    // Both edges land in whitespace, halfway between the block and whatever it is next
    // to: the rule above the heading, and the keyboard shortcut field below. A fixed
    // padding instead would be larger than the 24px gaps either side, and would print a
    // sliver of the rule along the top of the frame and slice into the field below.
    const rule = await page.locator(".lxHr").last().boundingBox();
    const top = (rule.y + rule.height + heading.y) / 2;
    const bottom = foot + (shortcut.y - foot) / 2;
    if (top < 0) {
        throw new Error("The Settings block no longer fits in this window above the modifier "
            + "field - give captureTrigger a taller viewport");
    }

    // Sideways the page's own gutters frame it: the settings block is inset 24px in a
    // 620px window, so the full width is already an even margin either side.
    const x = Math.max(0, settings.x - 26);
    const shot = await page.screenshot({
        clip: { x, y: top, width: Math.min(620 - x, settings.width + 52), height: bottom - top }
    });
    await page.close();
    return shot;
}

/**
 * Looks the promo word up in each of the marquee's languages, and reads back what the
 * dictionaries said.
 *
 * Driving the Action Popup rather than calling the services directly is what makes
 * the answers trustworthy: the popup's own language picker supplies the language
 * name, and the translation is read out of the history store, which means it has been
 * through the same parser that produces every other translation the extension shows.
 * A tile that printed a hand-typed Amharic word would be unverifiable by anyone here.
 *
 * Must run after the surface captures. These lookups are real, so they land in the
 * history store, and the History page is photographed with a deliberate set of rows.
 */
async function collectTranslations(context, extensionId) {
    const collected = [];

    for (const language of MARQUEE_LANGUAGES) {
        await setLanguage(context, extensionId, language);

        // A fresh popup per language rather than one reloaded five times. The popup
        // reads the stored language once, on load, and reuses it for the rest of its
        // life - a page kept open across a change of language would go on answering
        // for the language it started with.
        const page = await context.newPage();
        await page.setViewportSize({ width: 380, height: 640 });
        await page.goto(`chrome-extension://${extensionId}/html/popup.html`);
        await page.waitForLoadState("domcontentloaded");
        // The picker fills itself from the stored language. It staying empty means no
        // dictionary claims this one - which is what a mistyped code looks like from
        // here, and is worth saying rather than timing out on.
        await page.waitForFunction(() => {
            const input = document.querySelector('[role="combobox"]');
            return !!input && input.value.length > 0;
        }, undefined, { timeout: DICTIONARY_TIMEOUT }).catch(() => {
            throw new Error(`"${language}" is not a Language Direction the extension offers - `
                + "check it against LexinDictionary and FolketsDictionary getSupportedLanguages()");
        });
        const label = await page.locator('[role="combobox"]').inputValue();

        await page.fill("#wordInput", PROMO_WORD);
        await page.press("#wordInput", "Enter");
        await waitForEntry(page, "#translation");

        const stored = await page.evaluate(async (key) => {
            const entries = await chrome.storage.local.get(key);
            return JSON.parse(entries[key] || "[]");
        }, `history${language}`);
        await page.close();

        const row = stored.find((item) => item.word.toLowerCase() === PROMO_WORD);
        if (!row) {
            throw new Error(`${language}: the dictionary returned no entry for "${PROMO_WORD}"`);
        }

        // Lexin often answers with several synonyms. The tile has room for one, and
        // the first is the dictionary's own primary sense - not a choice made here.
        // Both separators are needed: the Ukrainian entry for "hund" comes back as
        // "пес; собака", where a comma split alone would set the semicolon on the tile.
        const text = row.translation.split(/[,;]/)[0].trim();
        if (!text || text.length > 28) {
            throw new Error(`${language}: "${text}" is not a translation this tile can set`);
        }
        console.log(`  ${language}  ${label} - ${text}`);
        collected.push({ label, text });
    }

    return collected;
}

/** Points the extension at one Language Direction, as the Options page would. */
async function setLanguage(context, extensionId, language) {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(async (value) => {
        await chrome.storage.local.set({ defaultLanguage: value });
    }, language);
    await page.close();
}

/**
 * How wide to draw an inset, as a magnification of what it was captured at.
 *
 * Drawn at 1.0 it would be a detail at the same scale as the page behind it and read
 * as part of it; drawn to a round number of tile pixels it lands at whatever
 * magnification the crop happens to imply, which on a small cut-out is enormous.
 * Deriving the width from the capture keeps the step deliberate.
 */
function insetWidth(shot, zoom) {
    return Math.round(describePng(shot).width / SCALE * zoom);
}

/** Mounts a capture on the 1280x800 canvas and writes it out. */
async function writeTile(browser, name, spec) {
    return writeAsset(browser, {
        file: path.join(OUTPUT_PATH, "screenshots", `${name}.png`),
        size: TILE,
        html: tileHtml({
            ...spec,
            shot: await dataUri(spec.shot),
            inset: spec.inset
                ? { ...spec.inset, shot: await dataUri(spec.inset.shot) }
                : undefined
        })
    });
}

async function main() {
    await fs.access(path.join(EXTENSION_PATH, "manifest.json")).catch(() => {
        throw new Error(`No build at ${EXTENSION_PATH} - run "npm run build" first`);
    });
    await fs.mkdir(OUTPUT_PATH, { recursive: true });

    const server = await startPageServer();
    const context = await chromium.launchPersistentContext("", {
        headless: false, // Extensions do not load in headless Chrome.
        deviceScaleFactor: SCALE,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            "--no-first-run",
            "--disable-default-apps",
            "--hide-scrollbars",
            "--force-color-profile=srgb"
        ]
    });

    try {
        const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
        const extensionId = worker.url().split("/")[2];
        await primeStorage(context, extensionId);

        console.log("Capturing surfaces...");
        const page = (file, size, prepare) =>
            capturePage(context, extensionId, file, size, prepare);
        const shots = {
            card: await captureCard(context),
            popup: await capturePopup(context, extensionId),
            history: await page("history.html", { width: 980, height: 620 }, stageHistory),
            options: await page("options.html", { width: 980, height: 660 }),
            settings: await page("options.html", { width: 980, height: 660 }, stageSettings),
            trigger: await captureTrigger(context, extensionId)
        };

        console.log("Looking the promo word up in each marquee language...");
        const translations = await collectTranslations(context, extensionId);
        await context.close();

        console.log("Composing tiles...");
        const browser = await chromium.launch();
        await writeTile(browser, "1-translation-card",
            { layout: "stacked", ...COPY.card, shot: shots.card, placement: { width: 950, top: 280 } });
        await writeTile(browser, "2-action-popup",
            { layout: "split", ...COPY.popup, shot: shots.popup, placement: { height: 660 } });
        await writeTile(browser, "3-history-page",
            { layout: "stacked", ...COPY.history, shot: shots.history, placement: { width: 980, top: 300 } });
        await writeTile(browser, "4-options-page",
            {
                layout: "stacked", ...COPY.options, shot: shots.options,
                placement: { width: 980, top: 300 },
                inset: { shot: shots.settings, width: insetWidth(shots.settings, 1.3), top: 505, right: 96 }
            });
        // The one tile whose capture does not bleed off the bottom edge. This crop is a
        // cut-out rather than a whole surface, and there is nowhere to cut it: a draw
        // large enough to run off the canvas would take the hint under the modifier
        // control with it, and that sentence is the reason the frame exists. So it is
        // sized to sit clear of the edge - 1.15x of a 620x400 crop, which leaves a
        // margin of about 30px underneath.
        await writeTile(browser, "5-lookup-trigger",
            {
                layout: "stacked", ...COPY.trigger, shot: shots.trigger,
                placement: { width: insetWidth(shots.trigger, 1.15), top: 296 }
            });

        const icon = await dataUri(ICON_PATH);
        await writeAsset(browser, {
            file: path.join(OUTPUT_PATH, "promo", "small-promo-tile.png"),
            size: SMALL,
            html: smallPromoHtml({
                icon, word: PROMO_WORD, translation: translations[0].text, ...COPY.small
            })
        });
        await writeAsset(browser, {
            file: path.join(OUTPUT_PATH, "promo", "marquee-promo-tile.png"),
            size: MARQUEE,
            html: marqueePromoHtml({ icon, word: PROMO_WORD, translations, ...COPY.marquee })
        });
        await browser.close();
    } finally {
        await context.close().catch(() => {});
        server.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

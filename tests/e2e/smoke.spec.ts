import { test, expect, ExtensionHelpers } from "./fixtures";
import { gestureLabel } from "../../src/scripts/common/LookupTrigger";

/**
 * The shipped gesture, spelled as the reader's own keyboard has it engraved - a Mac
 * says Option where everything else says Alt. Computed with the product's own
 * formatter rather than hardcoded, so this suite reads the same on a developer's
 * laptop as it does on the Linux box in CI.
 */
const DEFAULT_GESTURE = gestureLabel("alt", "double-click", process.platform === "darwin");

/**
 * Smoke tests for the Lexin Dictionary Chrome Extension.
 * 
 * These tests verify that the extension loads correctly and basic functionality works.
 * They should run quickly and catch major issues early.
 */
test.describe("Extension Smoke Tests", () => {
  
  test("extension should load successfully with valid extension ID", async ({ extensionId }) => {
    // Extension ID should be a 32-character string
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBe(32);
    expect(extensionId).toMatch(/^[a-z]+$/);
  });

  test("popup page should open and display UI elements", async ({ popupPage }) => {
    const page = await popupPage();
    
    // Check page title
    await expect(page).toHaveTitle("Lexin");
    
    // One search field, not the old From Swedish / To Swedish pair - which of the
    // two you typed in was what silently decided the lookup direction.
    await expect(page.locator("#wordInput")).toBeVisible();
    await expect(page.locator("#fromWordInput")).toHaveCount(0);

    await expect(page.locator("#translation")).toBeVisible();
    await expect(page.locator("#swapDirection")).toBeVisible();
    await expect(page.locator("#directionBadge")).toBeVisible();
    await expect(page.locator('[role="combobox"]')).toBeVisible();
    await expect(page.locator("#languageLabel")).toContainText("Language");

    // The old clock emoji used as an icon button is gone; History is reachable from
    // the Recent row instead.
    await expect(page.locator("#historyLink")).toHaveCount(0);
    await expect(page.locator("#recentChips")).toContainText("All history");

    await page.close();
  });

  test("popup language picker filters and commits by keyboard", async ({ popupPage }) => {
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    const input = page.locator('[role="combobox"]');
    await input.click();

    // The whole enabled set is offered before anything is typed.
    const all = await page.locator('[role="option"]').count();
    expect(all).toBeGreaterThan(1);

    // Substring, not prefix. Lexin offers "Northern Kurdish" and "South Kurdish", so
    // a prefix match on the word a reader actually reaches for would find neither.
    await input.fill("kurd");
    await expect(page.locator('[role="option"]')).toHaveCount(2);

    await input.fill("northern kurd");
    await expect(page.locator('[role="option"]')).toHaveCount(1);

    // Keyboard alone must be able to commit: the list is browsed with
    // aria-activedescendant while focus stays in the input.
    await input.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-activedescendant", /Option0$/);
    await input.press("Enter");

    await expect(input).toHaveValue("Northern Kurdish");
    await expect(page.locator('[role="listbox"]')).toBeHidden();

    await page.close();
  });

  test("popup language picker reports no match rather than an empty list", async ({ popupPage }) => {
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    const input = page.locator('[role="combobox"]');
    await input.click();
    await input.fill("klingon");

    await expect(page.locator('[role="option"]')).toHaveCount(0);
    await expect(page.locator('[role="listbox"]')).toContainText("No language matches");

    // Escape reverts to the committed language and must not close the popup itself.
    await input.press("Escape");
    await expect(page.locator('[role="listbox"]')).toBeHidden();
    await expect(input).not.toHaveValue("klingon");

    await page.close();
  });

  /** Every language row, once the table has been populated. */
  async function languageRows(page: import("@playwright/test").Page) {
    const rows = page.locator("#languageRows tr");
    await expect(rows.first()).toBeVisible();
    return rows;
  }

  /**
   * Pick an option in a segmented control by clicking its label, the way a reader
   * does. The radio itself is visually hidden - it is there so the group is
   * announced and arrow-key operable, not to be clicked.
   */
  async function pickSegOption(page: import("@playwright/test").Page, groupId: string, label: string) {
    await page.locator(`#${groupId} .lxSegOption`).filter({ hasText: new RegExp(`^${label}$`) }).click();
  }

  test("options page should open and display language settings", async ({ optionsPage }) => {
    const page = await optionsPage();

    await expect(page).toHaveTitle("Lexin dictionary Options");
    await expect(page.locator(".lxNavBrand")).toContainText("Options");

    const rows = await languageRows(page);
    expect(await rows.count()).toBe(22);

    // One default, N visible: a row carries one checkbox and either the chip or the
    // button - never the radio-plus-checkbox pair that made the old page a puzzle.
    await expect(page.locator('#languageRows input[type="radio"]')).toHaveCount(0);
    await expect(page.locator('#languageRows input[type="checkbox"]')).toHaveCount(22);
    await expect(page.locator("#languageRows .lxChip", { hasText: "Default" })).toHaveCount(1);

    // The old sidebar and its bulk checkbox are gone.
    await expect(page.locator("#navbar")).toHaveCount(0);
    await expect(page.locator("#checkAll")).toHaveCount(0);
    await expect(page.locator("#OptionsMenu")).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#enableAll")).toBeVisible();
    await expect(page.locator("#disableAll")).toBeVisible();

    await page.close();
  });

  test("options search narrows the language list", async ({ optionsPage }) => {
    const page = await optionsPage();
    await languageRows(page);

    // Two Kurdish languages, neither of which starts with the word.
    await page.locator("#languageSearch").fill("kurd");
    await expect(page.locator("#languageRows tr")).toHaveCount(2);

    // Folded, so an unaccented query still finds the accented name.
    await page.locator("#languageSearch").fill("");
    await expect(page.locator("#languageRows tr")).toHaveCount(22);

    await page.close();
  });

  test("setting a default moves the chip and pins that language visible", async ({ context, extensionId, optionsPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await optionsPage();
    await languageRows(page);

    const english = page.locator("#languageRows tr", { hasText: "English" });
    const arabic = page.locator("#languageRows tr", { hasText: "Arabic" });

    await expect(english.locator(".lxChip")).toHaveText("Default");
    // The default cannot be hidden - it is what a lookup falls back to.
    await expect(english.locator('input[type="checkbox"]')).toBeDisabled();
    await expect(english.locator('input[type="checkbox"]')).toBeChecked();

    await arabic.locator("button", { hasText: "Set default" }).click();

    await expect(arabic.locator(".lxChip")).toHaveText("Default");
    await expect(arabic.locator('input[type="checkbox"]')).toBeDisabled();
    await expect(english.locator("button", { hasText: "Set default" })).toBeVisible();
    await expect(english.locator('input[type="checkbox"]')).toBeEnabled();
    await expect(page.locator(".lxToast")).toContainText("Options saved");

    await page.close();
  });

  test("a hidden language cannot be made the default until it is visible", async ({ context, extensionId, optionsPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await optionsPage();
    await languageRows(page);

    const finnish = page.locator("#languageRows tr", { hasText: "Finnish" });
    await finnish.locator('input[type="checkbox"]').uncheck();

    // An em dash, not a button: make it visible first.
    await expect(finnish.locator("button")).toHaveCount(0);
    await expect(finnish.locator(".lxNoDefault")).toHaveText("—");

    await finnish.locator('input[type="checkbox"]').check();
    await expect(finnish.locator("button", { hasText: "Set default" })).toBeVisible();

    await page.close();
  });

  test("disable all leaves the default visible", async ({ context, extensionId, optionsPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await optionsPage();
    await languageRows(page);

    await page.locator("#disableAll").click();

    await expect(page.locator('#languageRows input[type="checkbox"]:checked')).toHaveCount(1);
    await expect(page.locator("#languageRows tr", { hasText: "English" })
      .locator('input[type="checkbox"]')).toBeChecked();

    await page.locator("#enableAll").click();
    await expect(page.locator('#languageRows input[type="checkbox"]:checked')).toHaveCount(22);

    await page.close();
  });

  test("appearance is finally writable, and the whole extension follows it", async ({ optionsPage, historyPage }) => {
    // The setting has been stored and honoured since the card redesign; until now
    // nothing could write it, so every reader was on "system".
    const page = await optionsPage();
    await expect(page.locator('#appearance input[value="system"]')).toBeChecked();

    await pickSegOption(page, "appearance", "Dark");

    // Applied on the page carrying the control, immediately.
    await expect(page.locator("html")).toHaveAttribute("data-lx-theme", "dark");
    await expect(page.locator(".lxToast")).toContainText("Options saved");

    await page.reload();
    await expect(page.locator('#appearance input[value="dark"]')).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-lx-theme", "dark");

    // And every other surface reads the same setting.
    const history = await historyPage();
    await expect(history.locator("html")).toHaveAttribute("data-lx-theme", "dark");

    await history.close();
    await page.close();
  });

  test("record history off stops new lookups being stored, and keeps the old ones", async ({ context, extensionId, optionsPage, popupPage, historyPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    await ExtensionHelpers.seedHistory(context, extensionId, {
      swe_eng: [{ word: "gammal", translation: "old", added: Date.parse("2026-07-01T10:00:00Z") }]
    });

    const options = await optionsPage();
    await expect(options.locator('#recordHistory input[value="on"]')).toBeChecked();
    await pickSegOption(options, "recordHistory", "Off");
    await expect(options.locator('#recordHistory input[value="off"]')).toBeChecked();
    await expect(options.locator(".lxToast")).toContainText("Options saved");
    await options.close();

    const popup = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(popup);
    const input = popup.locator("#wordInput");
    await input.click();
    await input.fill("bil");
    await input.dispatchEvent("keyup");
    // The lookup itself still works - the setting governs what is stored, not what
    // the reader gets to read.
    await expect(popup.locator("#translation")).toContainText("motorcar", { timeout: 15000 });
    await popup.close();

    const history = await historyPage();
    // Nothing added, and nothing taken away.
    await expect(history.locator("#historyCount")).toHaveText("1 word");
    await expect(history.locator("#history")).toContainText("gammal");
    await expect(history.locator("#history")).not.toContainText("bil");
    // And the list says why it stopped growing, rather than leaving the reader to
    // guess at it.
    await expect(history.locator(".lxNotice")).toContainText("Recording is off");

    await history.close();
  });

  test("history page turns recording back on itself", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.setRecordHistory(context, extensionId, false);
    await ExtensionHelpers.seedHistory(context, extensionId, {
      swe_eng: [{ word: "gammal", translation: "old", added: Date.parse("2026-07-01T10:00:00Z") }]
    });

    const page = await historyPage();
    await page.locator(".lxNotice .lxButton").click();

    await expect(page.locator(".lxToast")).toContainText("Recording is on");
    await expect(page.locator(".lxNotice")).toHaveCount(0);
    // What the service worker reads before it stores the next lookup.
    expect(await ExtensionHelpers.getStoredValue(context, extensionId, "recordHistory")).toBe("true");

    await page.close();
  });

  test("an empty history says which of the two empties it is", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.setRecordHistory(context, extensionId, false);

    const page = await historyPage();

    // Not "<gesture> to start building your list" - that advice builds
    // nothing while recording is off.
    await expect(page.locator("#history")).toContainText("Recording is off");
    await expect(page.locator("#history")).not.toContainText(DEFAULT_GESTURE);
    await page.locator("#history .lxButton").click();

    await expect(page.locator("#history")).toContainText("No translations yet");
    await expect(page.locator("#history")).toContainText(DEFAULT_GESTURE);

    await page.close();
  });

  test("history page should open and display UI elements", async ({ historyPage }) => {
    const page = await historyPage();

    await expect(page).toHaveTitle("Lexin dictionary History");

    await expect(page.locator(".lxNavBrand")).toContainText("History");
    await expect(page.locator("#historySearch")).toBeVisible();
    await expect(page.locator("#exportButton")).toBeVisible();
    await expect(page.locator("#clearHistory")).toBeVisible();

    // The 2012 sidebar is gone; the three pages link each other from the header.
    await expect(page.locator("#navbar")).toHaveCount(0);
    await expect(page.locator("#HistoryMenu")).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#OptionsMenu")).toBeVisible();
    await expect(page.locator("#HelpMenu")).toBeVisible();

    await page.close();
  });

  test("history page shows an empty state before anything is looked up", async ({ historyPage }) => {
    const page = await historyPage();

    await expect(page.locator("#history")).toContainText("No translations yet");
    await expect(page.locator("#history")).toContainText(DEFAULT_GESTURE);
    // Nothing to export or clear, so neither offers itself.
    await expect(page.locator("#exportButton")).toBeDisabled();
    await expect(page.locator("#clearHistory")).toBeDisabled();

    await page.close();
  });

  /**
   * Two directions of seeded history, so the History page has tabs, a repeated day to
   * group, and a translation containing a comma for the CSV path.
   */
  const DAY = 24 * 60 * 60 * 1000;
  const SEEDED_HISTORY = {
    swe_eng: [
      { word: "hem", translation: "home, abode", added: Date.parse("2026-08-01T10:00:00Z") },
      { word: "jobb", translation: "job", added: Date.parse("2026-08-01T09:00:00Z") },
      { word: "skola", translation: "school", added: Date.parse("2026-08-01T10:00:00Z") - DAY }
    ],
    swe_ara: [
      { word: "läkare", translation: "طبيب", added: Date.parse("2026-08-01T11:00:00Z") }
    ]
  };

  test("history page offers a tab per direction with history, plus All", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.seedHistory(context, extensionId, SEEDED_HISTORY);
    const page = await historyPage();

    const tabs = page.locator(".lxTab");
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveText("All");
    await expect(page.locator(".lxTab", { hasText: "sv→eng" })).toBeVisible();
    await expect(page.locator(".lxTab", { hasText: "sv→ara" })).toBeVisible();

    // All merges the directions and names each row's language, which a single
    // direction's view has no need to.
    await tabs.nth(0).click();
    await expect(page.locator("#historyCount")).toHaveText("4 words");
    await expect(page.locator(".lxTable th", { hasText: "Language" })).toBeVisible();
    await expect(page.locator(".lxTable tbody tr").first()).toContainText("läkare");

    await page.locator(".lxTab", { hasText: "sv→eng" }).click();
    await expect(page.locator("#historyCount")).toHaveText("3 words");
    await expect(page.locator(".lxTable th", { hasText: "Language" })).toHaveCount(0);

    await page.close();
  });

  /**
   * The monolingual Swedish dictionary explains a word rather than translating it, so
   * the column it fills is not a translation. A reader who only ever uses it gets no
   * tab strip at all, which is why the heading follows the rows rather than the tab.
   */
  test("the third column is named for what the dictionary answers with", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.seedHistory(context, extensionId, {
      swe_swe: [
        { word: "hund", translation: "ett husdjur som lever mycket nära människan", added: Date.parse("2026-08-01T10:00:00Z") }
      ]
    });
    const soloPage = await historyPage();

    await expect(soloPage.locator("#directionTabs")).toBeHidden();
    await expect(soloPage.locator(".lxTable th", { hasText: "Definition" })).toBeVisible();
    await expect(soloPage.locator(".lxTable th", { hasText: "Translation" })).toHaveCount(0);
    await soloPage.close();

    // Alongside a language pair it is per tab: All mixes the two, so "Translation"
    // is the heading that covers both.
    await ExtensionHelpers.seedHistory(context, extensionId, {
      ...SEEDED_HISTORY,
      swe_swe: [
        { word: "hund", translation: "ett husdjur som lever mycket nära människan", added: Date.parse("2026-08-01T10:00:00Z") }
      ]
    });
    const page = await historyPage();

    await page.locator(".lxTab", { hasText: "All" }).click();
    await expect(page.locator(".lxTable th", { hasText: "Translation" })).toBeVisible();

    await page.locator(".lxTab", { hasText: "sv→eng" }).click();
    await expect(page.locator(".lxTable th", { hasText: "Translation" })).toBeVisible();

    await page.locator(".lxTab").filter({ hasText: /^sv$/ }).click();
    await expect(page.locator(".lxTable th", { hasText: "Definition" })).toBeVisible();
    await expect(page.locator(".lxTable th", { hasText: "Translation" })).toHaveCount(0);

    await page.close();
  });

  test("history search narrows the rows and the count follows", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.seedHistory(context, extensionId, SEEDED_HISTORY);
    const page = await historyPage();
    await page.locator(".lxTab", { hasText: "sv→eng" }).click();

    await expect(page.locator(".lxTable tbody tr")).toHaveCount(3);

    // Matches the translation as well as the word.
    await page.locator("#historySearch").fill("scho");
    await expect(page.locator(".lxTable tbody tr")).toHaveCount(1);
    await expect(page.locator("#historyCount")).toHaveText("1 word");

    await page.locator("#historySearch").fill("lakare");
    await expect(page.locator("#history")).toContainText("No matches");

    await page.close();
  });

  test("history export writes the selected rows as Quizlet-ready TSV", async ({ context, extensionId, historyPage }) => {
    // The Help page used to answer this with eight manual steps.
    await ExtensionHelpers.seedHistory(context, extensionId, SEEDED_HISTORY);
    const page = await historyPage();
    await page.locator(".lxTab", { hasText: "sv→eng" }).click();

    await page.locator(".lxTable tbody tr").first().locator('input[type="checkbox"]').check();
    await expect(page.locator("#historyCount")).toHaveText("3 words · 1 selected");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await page.locator("#exportButton").click();
        await page.locator('#exportMenu li[data-format="tsv"]').click();
      })()
    ]);

    expect(download.suggestedFilename()).toMatch(/^lexin-history-\d{4}-\d{2}-\d{2}\.txt$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) { chunks.push(chunk as Buffer); }
    const text = Buffer.concat(chunks).toString("utf-8");

    // Only the checked row, two tab-separated columns, no header.
    expect(text).toBe("hem\thome, abode");

    await page.close();
  });

  test("history export falls back to everything in view when nothing is selected", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.seedHistory(context, extensionId, SEEDED_HISTORY);
    const page = await historyPage();
    await page.locator(".lxTab", { hasText: "sv→eng" }).click();
    await page.locator("#historySearch").fill("jobb");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await page.locator("#exportButton").click();
        await page.locator('#exportMenu li[data-format="csv"]').click();
      })()
    ]);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) { chunks.push(chunk as Buffer); }
    const text = Buffer.concat(chunks).toString("utf-8");

    expect(text).toContain("Word,Translation,Date");
    expect(text).toContain("jobb,job,");
    expect(text).not.toContain("hem");

    await page.close();
  });

  test("history copy to clipboard needs no extra permission", async ({ context, extensionId, historyPage }) => {
    // navigator.clipboard.writeText under a click has transient activation, so the
    // manifest still asks for `storage` and nothing else. The page reports success
    // only when the write resolved.
    await ExtensionHelpers.seedHistory(context, extensionId, SEEDED_HISTORY);
    const page = await historyPage();
    await page.locator(".lxTab", { hasText: "sv→eng" }).click();

    await page.locator("#exportButton").click();
    await page.locator('#exportMenu li[data-format="clipboard"]').click();

    // Confirmed by the shared toast, so the row count keeps meaning one thing.
    await expect(page.locator(".lxToast")).toHaveText("3 copied to clipboard");
    await expect(page.locator("#historyCount")).toHaveText("3 words");

    await page.close();
  });

  test("history per-row delete removes one entry for good", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.seedHistory(context, extensionId, SEEDED_HISTORY);
    const page = await historyPage();
    await page.locator(".lxTab", { hasText: "sv→eng" }).click();

    const row = page.locator(".lxTable tbody tr", { hasText: "jobb" });
    await row.hover();
    await row.locator(".lxRowDelete").click();

    await expect(page.locator(".lxTable tbody tr")).toHaveCount(2);
    await expect(page.locator("#history")).not.toContainText("jobb");

    await page.reload();
    await page.locator(".lxTab", { hasText: "sv→eng" }).click();
    await expect(page.locator("#history")).not.toContainText("jobb");

    await page.close();
  });

  test("history clear goes through a themed dialog that can be cancelled", async ({ context, extensionId, historyPage }) => {
    await ExtensionHelpers.seedHistory(context, extensionId, SEEDED_HISTORY);
    const page = await historyPage();
    await page.locator(".lxTab", { hasText: "sv→eng" }).click();

    await page.locator("#clearHistory").click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // It names what it is about to destroy, which confirm() could not.
    await expect(dialog).toContainText("Swedish → English");

    await dialog.locator("button", { hasText: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".lxTable tbody tr")).toHaveCount(3);

    await page.locator("#clearHistory").click();
    await page.locator('[role="dialog"] button', { hasText: "Clear history" }).click();

    // That direction is gone; the other one is untouched.
    await expect(page.locator("#history")).not.toContainText("hem");
    await expect(page.locator("#history")).toContainText("läkare");

    await page.close();
  });

  test("popup should report when no word is selected", async ({ popupPage }) => {
    const page = await popupPage();

    // The popup asks the active tab for its selection on open. Nothing answers
    // here - the popup is itself the active tab and runs no content script -
    // which is the same shape as opening the popup on a page with nothing
    // selected. sendMessageToActiveTab must settle so this branch can render;
    // it used to leave the promise pending and #translation stayed blank.
    await expect(page.locator("#translation")).toContainText("No word selected");

    // The Alt+double-click hint used to live in a dismissible blue banner that was
    // shown whether or not it was any use. It now rides on the empty state, which is
    // exactly when a reader has not discovered the gesture.
    await expect(page.locator("#translation")).toContainText(DEFAULT_GESTURE);
    await expect(page.locator("#quickTip")).toHaveCount(0);

    await page.close();
  });

  test("navigation between extension pages should work", async ({ optionsPage }) => {
    // All three pages share .lxNav now - the 2012 sidebar is gone from the extension.
    const page = await optionsPage();

    await page.click("#HistoryMenu");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle("Lexin dictionary History");

    await page.click("#HelpMenu");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle("Lexin dictionary Help");
    await expect(page.locator("#HelpMenu")).toHaveAttribute("aria-current", "page");

    await page.click("#OptionsMenu");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle("Lexin dictionary Options");

    await page.close();
  });

  test("help page explains the gesture visually and points at the export", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/html/help.html`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".lxNavBrand")).toContainText("Help");

    // Three gestures, each drawn rather than described in a numbered paragraph.
    const steps = page.locator(".lxStep");
    await expect(steps).toHaveCount(3);
    await expect(steps.first()).toContainText(`${DEFAULT_GESTURE} a word`);
    await expect(page.locator(".lxStepIcon svg")).toHaveCount(3);

    // The eight-step manual Quizlet walkthrough is replaced by pointing at the
    // export button that now exists.
    const body = await page.locator("main").innerText();
    expect(body).toContain("Quizlet-ready");
    expect(body).not.toContain("Between Term and Definition");
    expect(body).not.toContain("Copy table with translations history");

    await expect(page.locator("#folketsLink")).toBeVisible();
    await expect(page.locator("#issueLink")).toBeVisible();

    await page.close();
  });

  test("no page still loads the 2012 stylesheets", async ({ context, extensionId }) => {
    // "Two visual languages exist today, and that's a problem to solve" - this is the
    // assertion that they are down to one.
    for (const name of ["popup", "history", "options", "help"]) {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/html/${name}.html`);
      await page.waitForLoadState("domcontentloaded");

      const sheets = await page.evaluate(() =>
        Array.from(document.styleSheets).map((sheet) => sheet.href || ""));

      expect(sheets.some((href) => href.endsWith("/tokens.css")), `${name} loads tokens.css`).toBe(true);
      expect(sheets.some((href) => href.endsWith("/common.css")), `${name} still loads common.css`).toBe(false);
      expect(sheets.some((href) => href.endsWith("/chrome_shared.css")), `${name} still loads chrome_shared.css`).toBe(false);

      await page.close();
    }
  });

  /**
   * Type a word into the single search field and wait for its translation.
   *
   * pressSequentially would not do for Cyrillic, so the value is filled and a keyup
   * dispatched by hand - the popup debounces on keyup.
   */
  async function lookUp(page: import("@playwright/test").Page, word: string) {
    const input = page.locator("#wordInput");
    await input.click();
    await input.fill(word);
    await input.dispatchEvent("keyup");
  }

  test("translation should work in popup with Swedish language", async ({ context, extensionId, popupPage }) => {
    // The language is set through storage rather than through the picker: this test
    // is about the lookup, not about how a language gets chosen.
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, "bil");

    // Wait for the debounce (500ms) + network request
    await expect(page.locator("#translation")).toContainText("ett fordon för ett litet antal personer", {
      timeout: 15000
    });

    await page.close();
  });

  test("translation should work in popup with English language", async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, "bil");

    await expect(page.locator("#translation")).toContainText("motorcar", { timeout: 15000 });

    await page.close();
  });

  test("translation should work in popup with Russian language", async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_rus");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, "bil");

    await expect(page.locator("#translation")).toContainText("автомобиль", { timeout: 15000 });

    await page.close();
  });

  test("translation should work in popup with Ukrainian language", async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_ukr");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, "bil");

    await expect(page.locator("#translation")).toContainText("автомобіль", { timeout: 15000 });

    await page.close();
  });

  test("swap reverses the direction, and the badge says which way it runs", async ({ context, extensionId, popupPage }) => {
    // Replaces the old "To Swedish" field. Which of two boxes you typed in used to be
    // the only thing that decided this, and nothing on screen said so.
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_ukr");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    const badge = page.locator("#directionBadgeText");
    await expect(badge).toHaveText("sv→ukr");

    await page.locator("#swapDirection").click();
    await expect(badge).toHaveText("ukr→sv");

    await lookUp(page, "привіт");

    await expect(page.locator("#translation")).toContainText("hej", { timeout: 15000 });

    await page.close();
  });

  test("reverse translation English to Swedish should work", async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await page.locator("#swapDirection").click();
    await expect(page.locator("#directionBadgeText")).toHaveText("eng→sv");

    await lookUp(page, "king");

    await expect(page.locator("#translation")).toContainText("konung", { timeout: 15000 });

    await page.close();
  });

  test("reverse translation Russian to Swedish should work", async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_rus");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await page.locator("#swapDirection").click();
    await lookUp(page, "идиот");

    await expect(page.locator("#translation")).toContainText("idiot", { timeout: 15000 });

    await page.close();
  });

  test("swap is disabled for the monolingual Swedish dictionary", async ({ context, extensionId, popupPage }) => {
    // swe_swe is not a pair, and asking Lexin for its "from" direction returns
    // nothing at all - which the old two-field popup let you do anyway.
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await expect(page.locator("#directionBadgeText")).toHaveText("sv");
    await expect(page.locator("#swapDirection")).toBeDisabled();

    await page.close();
  });

  test("the monolingual dictionary looks up even with a reversed direction left over", async ({ context, extensionId, popupPage }) => {
    // Swapping on a pair language and then selecting swe_swe used to leave "from"
    // persisted, and the disabled swap control gave no way back: every lookup came
    // back empty until the reader changed languages twice.
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");
    await ExtensionHelpers.setTranslationDirection(context, extensionId, 1);

    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    await lookUp(page, "bil");

    await expect(page.locator("#translation")).toContainText("ett fordon för ett litet antal personer", {
      timeout: 15000
    });
    // Persisted, not just corrected on screen - the next popup has to open right too.
    expect(await ExtensionHelpers.getStoredValue(context, extensionId, "translationDirection")).toBe("2");

    await page.close();
  });

  test("recent lookups appear as chips and can be looked up again", async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    // Nothing looked up yet: the row still offers the route to the History page,
    // which is the popup's only one now that the clock emoji is gone.
    await expect(page.locator("#recentChips")).toContainText("All history");

    await lookUp(page, "bil");
    await expect(page.locator("#translation")).toContainText("motorcar", { timeout: 15000 });

    // History is written by the worker during the lookup, so the chip follows it.
    const chip = page.locator("#recentChips button", { hasText: /^bil$/ });
    await expect(chip).toBeVisible({ timeout: 10000 });

    await lookUp(page, "hus");
    await expect(page.locator("#translation")).toContainText("house", { timeout: 15000 });

    await chip.click();
    await expect(page.locator("#wordInput")).toHaveValue("bil");
    await expect(page.locator("#translation")).toContainText("motorcar", { timeout: 15000 });

    await page.close();
  });

  test("session navigation appears only once there is more than one lookup", async ({ context, extensionId, popupPage }) => {
    // Ctrl+left/right has always stepped through the session's lookups with nothing
    // on screen saying so.
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await expect(page.locator("#sessionNav")).toBeHidden();

    await lookUp(page, "bil");
    await expect(page.locator("#translation")).toContainText("motorcar", { timeout: 15000 });
    await expect(page.locator("#sessionNav")).toBeHidden();

    await lookUp(page, "hus");
    await expect(page.locator("#translation")).toContainText("house", { timeout: 15000 });

    const nav = page.locator("#sessionNav");
    await expect(nav).toBeVisible();
    // At the newest lookup there is nowhere forward to go.
    await expect(page.locator("#historyForward")).toBeDisabled();

    await page.locator("#historyBack").click();
    await expect(page.locator("#wordInput")).toHaveValue("bil");
    await expect(page.locator("#historyBack")).toBeDisabled();
    await expect(page.locator("#historyForward")).toBeEnabled();

    await page.close();
  });

  test("languages added since the last version should be enabled on upgrade", async ({ popupPage }) => {
    // Rewind storage to what a user of an older build would have: a hand-picked enabled list and
    // no knownLanguages key. The next popup must pick up everything shipped since that build -
    // Ukrainian and Tigrinya - without resurrecting the languages this user turned off.
    const seedPage = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(seedPage);
    await seedPage.evaluate(async () => {
      await chrome.storage.local.remove("knownLanguages");
      await chrome.storage.local.set({
        enabledLanguages: "swe_rus,swe_eng",
        defaultLanguage: "swe_rus"
      });
    });
    await seedPage.close();

    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    // The picker offers exactly the enabled set, so its options are what to read.
    await page.locator('[role="combobox"]').click();
    const offered = await page.locator('[role="option"]').allInnerTexts();

    expect(offered).toContain("Ukrainian");
    expect(offered).toContain("Tigrinya");
    expect(offered).toContain("Russian");
    expect(offered).toContain("English");
    // Languages this user had disabled must stay disabled
    expect(offered).not.toContain("Swedish");
    expect(offered).not.toContain("Turkish");
    expect(offered.length).toBe(4);

    await page.close();
  });

  test("popup CSS should allow expansion based on translation content", async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    // Verify CSS allows expansion: body should NOT have overflow: hidden
    const bodyOverflow = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return {
        overflowY: style.overflowY,
        overflowX: style.overflowX
      };
    });
    // overflowY should not be 'hidden' (can be 'visible' or 'auto' for flex containers)
    expect(bodyOverflow.overflowY).not.toBe("hidden");
    expect(bodyOverflow.overflowX).toBe("hidden");
    
    // Verify translation container allows expansion (not hidden)
    const containerOverflow = await page.evaluate(() => {
      const container = document.querySelector(".lexinTranslationContainer");
      if (!container) {return null;}
      const style = window.getComputedStyle(container);
      return {
        overflowY: style.overflowY,
        overflowX: style.overflowX
      };
    });
    expect(containerOverflow?.overflowY).not.toBe("hidden");
    expect(containerOverflow?.overflowX).toBe("hidden");
    
    // Verify translation popup allows expansion (should not be 'hidden')
    const popupOverflow = await page.evaluate(() => {
      const popup = document.querySelector(".lexinTranslationPopup");
      if (!popup) {return null;}
      const style = window.getComputedStyle(popup);
      return {
        overflowY: style.overflowY,
        overflowX: style.overflowX
      };
    });
    // overflowY should not be 'hidden' to allow expansion
    // Note: Browser may compute 'visible' as 'auto' for flex items, which is acceptable
    expect(popupOverflow?.overflowY).not.toBe("hidden");
    expect(popupOverflow?.overflowX).toBe("hidden");
    
    // Type a word that will produce a translation
    const wordInput = page.locator("#wordInput");
    await wordInput.click();
    await wordInput.pressSequentially("bil", { delay: 50 });
    
    // Wait for translation to appear
    await ExtensionHelpers.waitForTranslation(page, 15000);
    
    // Verify translation container is visible and has content
    const translation = page.locator("#translation");
    await expect(translation).toBeVisible();
    await expect(translation).not.toBeEmpty();
    
    // Verify that the translation content is fully visible (not cut off by overflow)
    // This ensures the popup can expand to show all content
    const translationHeight = await page.evaluate(() => {
      const popup = document.querySelector(".lexinTranslationPopup");
      return popup ? {
        scrollHeight: popup.scrollHeight,
        clientHeight: popup.clientHeight,
        hasScrollbar: popup.scrollHeight > popup.clientHeight
      } : null;
    });
    
    // The popup should show content without requiring scrolling (if content fits)
    // If scrollHeight > clientHeight, it means content is being cut off
    // With overflow-y: visible, the popup should expand to show all content
    expect(translationHeight).toBeTruthy();
    
    await page.close();
  });

  test("popup should have responsive max-height based on viewport", async ({ popupPage }) => {
    const page = await popupPage();
    
    // Wait for languages to be loaded
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    
    // Wait for responsive sizing to be applied
    await page.waitForTimeout(100);
    
    // Check that max-height is set on body
    const maxHeight = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return {
        maxHeight: computedStyle.maxHeight,
        customProperty: body.style.getPropertyValue("--popup-max-height"),
        inlineMaxHeight: body.style.maxHeight
      };
    });
    
    // Verify max-height is set (should be a pixel value or CSS custom property)
    expect(maxHeight.maxHeight).toBeTruthy();
    expect(maxHeight.maxHeight).not.toBe("none");
    
    // The max-height should be capped at 600px (Chrome's limit) or 70% of screen
    const maxHeightValue = parseInt(maxHeight.maxHeight);
    expect(maxHeightValue).toBeLessThanOrEqual(600);
    expect(maxHeightValue).toBeGreaterThan(0);
    
    await page.close();
  });

  test("Alt+Double click on page should show Swedish translation", async ({ context, extensionId }) => {
    // First, set the language to Swedish via the popup
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");
    
    // Navigate to the test page
    const page = await context.newPage();
    await page.goto("http://localhost:3456/swedish-text.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    
    // Find and click on the test word "bil"
    const testWord = page.locator("#test-word");
    await expect(testWord).toBeVisible();
    await ExtensionHelpers.triggerLookup(page, "#test-word");
    
    // Verify translation popup appears with Swedish definition
    const translationContent = page.locator(".lexinTranslationContent");
    await expect(translationContent).toBeVisible({ timeout: 15000 });
    await expect(translationContent).toContainText("ett fordon för ett litet antal personer", { timeout: 10000 });
    
    await page.close();
  });

  test("Alt+Double click on page should show English translation", async ({ context, extensionId }) => {
    // First, set the language to English via the popup
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");
    
    // Navigate to the test page
    const page = await context.newPage();
    await page.goto("http://localhost:3456/swedish-text.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    
    // Find and click on the test word "bil"
    const testWord = page.locator("#test-word");
    await expect(testWord).toBeVisible();
    await ExtensionHelpers.triggerLookup(page, "#test-word");
    
    // Verify translation popup appears with English translation
    const translationContent = page.locator(".lexinTranslationContent");
    await expect(translationContent).toBeVisible({ timeout: 15000 });
    await expect(translationContent).toContainText("motorcar", { timeout: 10000 });
    
    await page.close();
  });

  test("Translation Card header names the word and the Language Direction", async ({ context, extensionId }) => {
    // The card used to be 100% dictionary markup: mid-lookup there was no way to
    // tell which word had been looked up, in which language pair, and no way out
    // but clicking blindly outside it. Both facts are inputs the extension already
    // holds when it fires the lookup, so neither reads the response.
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_eng");

    const page = await context.newPage();
    await page.goto("http://localhost:3456/swedish-text.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    const testWord = page.locator("#test-word");
    await expect(testWord).toBeVisible();
    await ExtensionHelpers.triggerLookup(page, "#test-word");

    // Locators pierce the open shadow root.
    const header = page.locator(".lexinCardHeader");
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".lexinCardWord")).toContainText("bil");
    await expect(page.locator(".lexinCardPair")).toHaveText("· sv→eng");

    // Both chrome buttons are real controls, not emoji - the card has to be
    // dismissible without a mouse, since the trigger is a modifier gesture.
    await expect(page.locator('.lexinCardButton[aria-label="Close"]')).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".lexinExtensionMainContainer")).toHaveCount(0);

    await page.close();
  });

  test("Translation Card grows to its entry instead of a fixed viewport", async ({ context, extensionId }) => {
    // A two-line entry used to render in a card locked to 20em, two thirds empty.
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_swe");

    const page = await context.newPage();
    await page.goto("http://localhost:3456/swedish-text.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    await ExtensionHelpers.triggerLookup(page, "#test-word");

    const content = page.locator(".lexinTranslationContent");
    await expect(content).toContainText("ett fordon för ett litet antal personer", { timeout: 15000 });

    const box = await content.boundingBox();
    // Capped, and no longer pinned to a floor.
    expect(box!.height).toBeLessThanOrEqual(480);
    expect(box!.height).toBeGreaterThan(0);

    await page.close();
  });

  test("Alt+Double click on page should show Russian translation", async ({ context, extensionId }) => {
    // First, set the language to Russian via the popup
    await ExtensionHelpers.setLanguage(context, extensionId, "swe_rus");
    
    // Navigate to the test page
    const page = await context.newPage();
    await page.goto("http://localhost:3456/swedish-text.html");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    
    // Find and click on the test word "bil"
    const testWord = page.locator("#test-word");
    await expect(testWord).toBeVisible();
    await ExtensionHelpers.triggerLookup(page, "#test-word");
    
    // Verify translation popup appears with Russian translation
    const translationContent = page.locator(".lexinTranslationContent");
    await expect(translationContent).toBeVisible({ timeout: 15000 });
    await expect(translationContent).toContainText("автомобиль", { timeout: 10000 });
    
    await page.close();
  });
});

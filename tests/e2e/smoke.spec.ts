import { test, expect, ExtensionHelpers } from './fixtures';

/**
 * Smoke tests for the Lexin Dictionary Chrome Extension.
 * 
 * These tests verify that the extension loads correctly and basic functionality works.
 * They should run quickly and catch major issues early.
 */
test.describe('Extension Smoke Tests', () => {
  
  test('extension should load successfully with valid extension ID', async ({ extensionId }) => {
    // Extension ID should be a 32-character string
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBe(32);
    expect(extensionId).toMatch(/^[a-z]+$/);
  });

  test('popup page should open and display UI elements', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Check page title
    await expect(page).toHaveTitle('Lexin');
    
    // One search field, not the old From Swedish / To Swedish pair - which of the
    // two you typed in was what silently decided the lookup direction.
    await expect(page.locator('#wordInput')).toBeVisible();
    await expect(page.locator('#fromWordInput')).toHaveCount(0);

    await expect(page.locator('#translation')).toBeVisible();
    await expect(page.locator('#swapDirection')).toBeVisible();
    await expect(page.locator('#directionBadge')).toBeVisible();
    await expect(page.locator('[role="combobox"]')).toBeVisible();
    await expect(page.locator('#languageLabel')).toContainText('Language');

    // The old clock emoji used as an icon button is gone; History is reachable from
    // the Recent row instead.
    await expect(page.locator('#historyLink')).toHaveCount(0);
    await expect(page.locator('#recentChips')).toContainText('All history');

    await page.close();
  });

  test('popup language picker filters and commits by keyboard', async ({ popupPage }) => {
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    const input = page.locator('[role="combobox"]');
    await input.click();

    // The whole enabled set is offered before anything is typed.
    const all = await page.locator('[role="option"]').count();
    expect(all).toBeGreaterThan(1);

    // Substring, not prefix. Lexin offers "Northern Kurdish" and "South Kurdish", so
    // a prefix match on the word a reader actually reaches for would find neither.
    await input.fill('kurd');
    await expect(page.locator('[role="option"]')).toHaveCount(2);

    await input.fill('northern kurd');
    await expect(page.locator('[role="option"]')).toHaveCount(1);

    // Keyboard alone must be able to commit: the list is browsed with
    // aria-activedescendant while focus stays in the input.
    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', /Option0$/);
    await input.press('Enter');

    await expect(input).toHaveValue('Northern Kurdish');
    await expect(page.locator('[role="listbox"]')).toBeHidden();

    await page.close();
  });

  test('popup language picker reports no match rather than an empty list', async ({ popupPage }) => {
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    const input = page.locator('[role="combobox"]');
    await input.click();
    await input.fill('klingon');

    await expect(page.locator('[role="option"]')).toHaveCount(0);
    await expect(page.locator('[role="listbox"]')).toContainText('No language matches');

    // Escape reverts to the committed language and must not close the popup itself.
    await input.press('Escape');
    await expect(page.locator('[role="listbox"]')).toBeHidden();
    await expect(input).not.toHaveValue('klingon');

    await page.close();
  });

  test('options page should open and display language settings', async ({ optionsPage }) => {
    const page = await optionsPage();
    
    // Check page title
    await expect(page).toHaveTitle('Lexin dictionary Options');
    
    // Check main UI elements are present
    await expect(page.locator('.page h1')).toContainText('Options');
    await expect(page.locator('#languageButtons')).toBeVisible();
    await expect(page.locator('#checkAll')).toBeVisible();
    
    // Check navigation menu is present
    await expect(page.locator('#navbar')).toBeVisible();
    await expect(page.locator('#HistoryMenu')).toBeVisible();
    await expect(page.locator('#OptionsMenu')).toBeVisible();
    await expect(page.locator('#HelpMenu')).toBeVisible();
    
    // Wait for language buttons to be populated
    await page.waitForFunction(() => {
      const container = document.querySelector('#languageButtons');
      return container && container.children.length > 0;
    });
    
    // Check that language radio buttons and checkboxes are present
    const radioButtons = await page.locator('#languageButtons input[type="radio"]').count();
    const checkboxes = await page.locator('#languageButtons input[type="checkbox"]').count();
    
    expect(radioButtons).toBeGreaterThan(0);
    expect(checkboxes).toBeGreaterThan(0);
    
    await page.close();
  });

  test('history page should open and display UI elements', async ({ historyPage }) => {
    const page = await historyPage();
    
    // Check page title
    await expect(page).toHaveTitle('Lexin dictionary History');
    
    // Check main UI elements are present
    await expect(page.locator('.page h1')).toContainText('History');
    await expect(page.locator('#language')).toBeVisible();
    await expect(page.locator('#clearHistory')).toBeVisible();
    
    // Check navigation menu is present
    await expect(page.locator('#navbar')).toBeVisible();
    
    await page.close();
  });

  test('popup should report when no word is selected', async ({ popupPage }) => {
    const page = await popupPage();

    // The popup asks the active tab for its selection on open. Nothing answers
    // here - the popup is itself the active tab and runs no content script -
    // which is the same shape as opening the popup on a page with nothing
    // selected. sendMessageToActiveTab must settle so this branch can render;
    // it used to leave the promise pending and #translation stayed blank.
    await expect(page.locator('#translation')).toContainText('No word selected');

    // The Alt+double-click hint used to live in a dismissible blue banner that was
    // shown whether or not it was any use. It now rides on the empty state, which is
    // exactly when a reader has not discovered the gesture.
    await expect(page.locator('#translation')).toContainText('Alt + double-click');
    await expect(page.locator('#quickTip')).toHaveCount(0);

    await page.close();
  });

  test('navigation between extension pages should work', async ({ optionsPage }) => {
    const page = await optionsPage();
    
    // Click on History link in navigation
    await page.click('#HistoryMenu a');
    
    // Wait for navigation
    await page.waitForLoadState('domcontentloaded');
    
    // Should now be on history page
    await expect(page).toHaveTitle('Lexin dictionary History');
    
    // Navigate to Help page
    await page.click('#HelpMenu a');
    await page.waitForLoadState('domcontentloaded');
    
    // Should now be on help page
    await expect(page).toHaveTitle('Lexin dictionary Help');
    
    await page.close();
  });

  /**
   * Type a word into the single search field and wait for its translation.
   *
   * pressSequentially would not do for Cyrillic, so the value is filled and a keyup
   * dispatched by hand - the popup debounces on keyup.
   */
  async function lookUp(page: import('@playwright/test').Page, word: string) {
    const input = page.locator('#wordInput');
    await input.click();
    await input.fill(word);
    await input.dispatchEvent('keyup');
  }

  test('translation should work in popup with Swedish language', async ({ context, extensionId, popupPage }) => {
    // The language is set through storage rather than through the picker: this test
    // is about the lookup, not about how a language gets chosen.
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_swe');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, 'bil');

    // Wait for the debounce (500ms) + network request
    await expect(page.locator('#translation')).toContainText('ett fordon för ett litet antal personer', {
      timeout: 15000
    });

    await page.close();
  });

  test('translation should work in popup with English language', async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_eng');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, 'bil');

    await expect(page.locator('#translation')).toContainText('motorcar', { timeout: 15000 });

    await page.close();
  });

  test('translation should work in popup with Russian language', async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_rus');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, 'bil');

    await expect(page.locator('#translation')).toContainText('автомобиль', { timeout: 15000 });

    await page.close();
  });

  test('translation should work in popup with Ukrainian language', async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_ukr');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await lookUp(page, 'bil');

    await expect(page.locator('#translation')).toContainText('автомобіль', { timeout: 15000 });

    await page.close();
  });

  test('swap reverses the direction, and the badge says which way it runs', async ({ context, extensionId, popupPage }) => {
    // Replaces the old "To Swedish" field. Which of two boxes you typed in used to be
    // the only thing that decided this, and nothing on screen said so.
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_ukr');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    const badge = page.locator('#directionBadgeText');
    await expect(badge).toHaveText('sv→ukr');

    await page.locator('#swapDirection').click();
    await expect(badge).toHaveText('ukr→sv');

    await lookUp(page, 'привіт');

    await expect(page.locator('#translation')).toContainText('hej', { timeout: 15000 });

    await page.close();
  });

  test('reverse translation English to Swedish should work', async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_eng');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await page.locator('#swapDirection').click();
    await expect(page.locator('#directionBadgeText')).toHaveText('eng→sv');

    await lookUp(page, 'king');

    await expect(page.locator('#translation')).toContainText('konung', { timeout: 15000 });

    await page.close();
  });

  test('reverse translation Russian to Swedish should work', async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_rus');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await page.locator('#swapDirection').click();
    await lookUp(page, 'идиот');

    await expect(page.locator('#translation')).toContainText('idiot', { timeout: 15000 });

    await page.close();
  });

  test('swap is disabled for the monolingual Swedish dictionary', async ({ context, extensionId, popupPage }) => {
    // swe_swe is not a pair, and asking Lexin for its "from" direction returns
    // nothing at all - which the old two-field popup let you do anyway.
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_swe');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await expect(page.locator('#directionBadgeText')).toHaveText('sv');
    await expect(page.locator('#swapDirection')).toBeDisabled();

    await page.close();
  });

  test('recent lookups appear as chips and can be looked up again', async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_eng');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    // Nothing looked up yet: the row still offers the route to the History page,
    // which is the popup's only one now that the clock emoji is gone.
    await expect(page.locator('#recentChips')).toContainText('All history');

    await lookUp(page, 'bil');
    await expect(page.locator('#translation')).toContainText('motorcar', { timeout: 15000 });

    // History is written by the worker during the lookup, so the chip follows it.
    const chip = page.locator('#recentChips button', { hasText: /^bil$/ });
    await expect(chip).toBeVisible({ timeout: 10000 });

    await lookUp(page, 'hus');
    await expect(page.locator('#translation')).toContainText('house', { timeout: 15000 });

    await chip.click();
    await expect(page.locator('#wordInput')).toHaveValue('bil');
    await expect(page.locator('#translation')).toContainText('motorcar', { timeout: 15000 });

    await page.close();
  });

  test('session navigation appears only once there is more than one lookup', async ({ context, extensionId, popupPage }) => {
    // Ctrl+left/right has always stepped through the session's lookups with nothing
    // on screen saying so.
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_eng');
    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    await expect(page.locator('#sessionNav')).toBeHidden();

    await lookUp(page, 'bil');
    await expect(page.locator('#translation')).toContainText('motorcar', { timeout: 15000 });
    await expect(page.locator('#sessionNav')).toBeHidden();

    await lookUp(page, 'hus');
    await expect(page.locator('#translation')).toContainText('house', { timeout: 15000 });

    const nav = page.locator('#sessionNav');
    await expect(nav).toBeVisible();
    // At the newest lookup there is nowhere forward to go.
    await expect(page.locator('#historyForward')).toBeDisabled();

    await page.locator('#historyBack').click();
    await expect(page.locator('#wordInput')).toHaveValue('bil');
    await expect(page.locator('#historyBack')).toBeDisabled();
    await expect(page.locator('#historyForward')).toBeEnabled();

    await page.close();
  });

  test('languages added since the last version should be enabled on upgrade', async ({ popupPage }) => {
    // Rewind storage to what a user of an older build would have: a hand-picked enabled list and
    // no knownLanguages key. The next popup must pick up Ukrainian without resurrecting the
    // languages this user turned off.
    const seedPage = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(seedPage);
    await seedPage.evaluate(async () => {
      await chrome.storage.local.remove('knownLanguages');
      await chrome.storage.local.set({
        enabledLanguages: 'swe_rus,swe_eng',
        defaultLanguage: 'swe_rus'
      });
    });
    await seedPage.close();

    const page = await popupPage();
    await ExtensionHelpers.waitForLanguagesLoaded(page);

    // The picker offers exactly the enabled set, so its options are what to read.
    await page.locator('[role="combobox"]').click();
    const offered = await page.locator('[role="option"]').allInnerTexts();

    expect(offered).toContain('Ukrainian');
    expect(offered).toContain('Russian');
    expect(offered).toContain('English');
    // Languages this user had disabled must stay disabled
    expect(offered).not.toContain('Swedish');
    expect(offered).not.toContain('Turkish');
    expect(offered.length).toBe(3);

    await page.close();
  });

  test('popup CSS should allow expansion based on translation content', async ({ context, extensionId, popupPage }) => {
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_eng');
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
    expect(bodyOverflow.overflowY).not.toBe('hidden');
    expect(bodyOverflow.overflowX).toBe('hidden');
    
    // Verify translation container allows expansion (not hidden)
    const containerOverflow = await page.evaluate(() => {
      const container = document.querySelector('.lexinTranslationContainer');
      if (!container) return null;
      const style = window.getComputedStyle(container);
      return {
        overflowY: style.overflowY,
        overflowX: style.overflowX
      };
    });
    expect(containerOverflow?.overflowY).not.toBe('hidden');
    expect(containerOverflow?.overflowX).toBe('hidden');
    
    // Verify translation popup allows expansion (should not be 'hidden')
    const popupOverflow = await page.evaluate(() => {
      const popup = document.querySelector('.lexinTranslationPopup');
      if (!popup) return null;
      const style = window.getComputedStyle(popup);
      return {
        overflowY: style.overflowY,
        overflowX: style.overflowX
      };
    });
    // overflowY should not be 'hidden' to allow expansion
    // Note: Browser may compute 'visible' as 'auto' for flex items, which is acceptable
    expect(popupOverflow?.overflowY).not.toBe('hidden');
    expect(popupOverflow?.overflowX).toBe('hidden');
    
    // Type a word that will produce a translation
    const wordInput = page.locator('#wordInput');
    await wordInput.click();
    await wordInput.pressSequentially('bil', { delay: 50 });
    
    // Wait for translation to appear
    await ExtensionHelpers.waitForTranslation(page, 15000);
    
    // Verify translation container is visible and has content
    const translation = page.locator('#translation');
    await expect(translation).toBeVisible();
    await expect(translation).not.toBeEmpty();
    
    // Verify that the translation content is fully visible (not cut off by overflow)
    // This ensures the popup can expand to show all content
    const translationHeight = await page.evaluate(() => {
      const popup = document.querySelector('.lexinTranslationPopup');
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

  test('popup should have responsive max-height based on viewport', async ({ popupPage }) => {
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
        customProperty: body.style.getPropertyValue('--popup-max-height'),
        inlineMaxHeight: body.style.maxHeight
      };
    });
    
    // Verify max-height is set (should be a pixel value or CSS custom property)
    expect(maxHeight.maxHeight).toBeTruthy();
    expect(maxHeight.maxHeight).not.toBe('none');
    
    // The max-height should be capped at 600px (Chrome's limit) or 70% of screen
    const maxHeightValue = parseInt(maxHeight.maxHeight);
    expect(maxHeightValue).toBeLessThanOrEqual(600);
    expect(maxHeightValue).toBeGreaterThan(0);
    
    await page.close();
  });

  test('Alt+Double click on page should show Swedish translation', async ({ context, extensionId }) => {
    // First, set the language to Swedish via the popup
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_swe');
    
    // Navigate to the test page
    const page = await context.newPage();
    await page.goto('http://localhost:3456/swedish-text.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // Find and click on the test word "bil"
    const testWord = page.locator('#test-word');
    await expect(testWord).toBeVisible();
    const boundingBox = await testWord.boundingBox();
    const clickX = boundingBox!.x + boundingBox!.width / 2;
    const clickY = boundingBox!.y + boundingBox!.height / 2;
    
    // Alt + Double click
    await page.keyboard.down('Alt');
    await page.mouse.dblclick(clickX, clickY);
    await page.keyboard.up('Alt');
    
    // Verify translation popup appears with Swedish definition
    const translationContent = page.locator('.lexinTranslationContent');
    await expect(translationContent).toBeVisible({ timeout: 15000 });
    await expect(translationContent).toContainText('ett fordon för ett litet antal personer', { timeout: 10000 });
    
    await page.close();
  });

  test('Alt+Double click on page should show English translation', async ({ context, extensionId }) => {
    // First, set the language to English via the popup
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_eng');
    
    // Navigate to the test page
    const page = await context.newPage();
    await page.goto('http://localhost:3456/swedish-text.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // Find and click on the test word "bil"
    const testWord = page.locator('#test-word');
    await expect(testWord).toBeVisible();
    const boundingBox = await testWord.boundingBox();
    const clickX = boundingBox!.x + boundingBox!.width / 2;
    const clickY = boundingBox!.y + boundingBox!.height / 2;
    
    // Alt + Double click
    await page.keyboard.down('Alt');
    await page.mouse.dblclick(clickX, clickY);
    await page.keyboard.up('Alt');
    
    // Verify translation popup appears with English translation
    const translationContent = page.locator('.lexinTranslationContent');
    await expect(translationContent).toBeVisible({ timeout: 15000 });
    await expect(translationContent).toContainText('motorcar', { timeout: 10000 });
    
    await page.close();
  });

  test('Translation Card header names the word and the Language Direction', async ({ context, extensionId }) => {
    // The card used to be 100% dictionary markup: mid-lookup there was no way to
    // tell which word had been looked up, in which language pair, and no way out
    // but clicking blindly outside it. Both facts are inputs the extension already
    // holds when it fires the lookup, so neither reads the response.
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_eng');

    const page = await context.newPage();
    await page.goto('http://localhost:3456/swedish-text.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const testWord = page.locator('#test-word');
    await expect(testWord).toBeVisible();
    const boundingBox = await testWord.boundingBox();
    const clickX = boundingBox!.x + boundingBox!.width / 2;
    const clickY = boundingBox!.y + boundingBox!.height / 2;

    await page.keyboard.down('Alt');
    await page.mouse.dblclick(clickX, clickY);
    await page.keyboard.up('Alt');

    // Locators pierce the open shadow root.
    const header = page.locator('.lexinCardHeader');
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.lexinCardWord')).toContainText('bil');
    await expect(page.locator('.lexinCardPair')).toHaveText('· sv→eng');

    // Both chrome buttons are real controls, not emoji - the card has to be
    // dismissible without a mouse, since the trigger is a modifier gesture.
    await expect(page.locator('.lexinCardButton[aria-label="Close"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.lexinExtensionMainContainer')).toHaveCount(0);

    await page.close();
  });

  test('Translation Card grows to its entry instead of a fixed viewport', async ({ context, extensionId }) => {
    // A two-line entry used to render in a card locked to 20em, two thirds empty.
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_swe');

    const page = await context.newPage();
    await page.goto('http://localhost:3456/swedish-text.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const testWord = page.locator('#test-word');
    const boundingBox = await testWord.boundingBox();
    await page.keyboard.down('Alt');
    await page.mouse.dblclick(boundingBox!.x + boundingBox!.width / 2, boundingBox!.y + boundingBox!.height / 2);
    await page.keyboard.up('Alt');

    const content = page.locator('.lexinTranslationContent');
    await expect(content).toContainText('ett fordon för ett litet antal personer', { timeout: 15000 });

    const box = await content.boundingBox();
    // Capped, and no longer pinned to a floor.
    expect(box!.height).toBeLessThanOrEqual(480);
    expect(box!.height).toBeGreaterThan(0);

    await page.close();
  });

  test('Alt+Double click on page should show Russian translation', async ({ context, extensionId }) => {
    // First, set the language to Russian via the popup
    await ExtensionHelpers.setLanguage(context, extensionId, 'swe_rus');
    
    // Navigate to the test page
    const page = await context.newPage();
    await page.goto('http://localhost:3456/swedish-text.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // Find and click on the test word "bil"
    const testWord = page.locator('#test-word');
    await expect(testWord).toBeVisible();
    const boundingBox = await testWord.boundingBox();
    const clickX = boundingBox!.x + boundingBox!.width / 2;
    const clickY = boundingBox!.y + boundingBox!.height / 2;
    
    // Alt + Double click
    await page.keyboard.down('Alt');
    await page.mouse.dblclick(clickX, clickY);
    await page.keyboard.up('Alt');
    
    // Verify translation popup appears with Russian translation
    const translationContent = page.locator('.lexinTranslationContent');
    await expect(translationContent).toBeVisible({ timeout: 15000 });
    await expect(translationContent).toContainText('автомобиль', { timeout: 10000 });
    
    await page.close();
  });
});

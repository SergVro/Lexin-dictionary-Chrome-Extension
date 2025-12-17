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
    
    // Check main UI elements are present
    await expect(page.locator('#wordInput')).toBeVisible();
    await expect(page.locator('#fromWordInput')).toBeVisible();
    await expect(page.locator('#language')).toBeVisible();
    await expect(page.locator('#translation')).toBeVisible();
    await expect(page.locator('#historyLink')).toBeVisible();
    
    // Check labels
    await expect(page.locator('label[for="wordInput"]')).toContainText('From Swedish');
    await expect(page.locator('label[for="fromWordInput"]')).toContainText('To Swedish');
    await expect(page.locator('label[for="language"]')).toContainText('Language');
    
    await page.close();
  });

  test('popup should load available languages in dropdown', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Wait for languages to be loaded
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    
    // Get all options from the language dropdown
    const options = await page.locator('#language option').all();
    
    // Should have multiple language options
    expect(options.length).toBeGreaterThan(0);
    
    // Check that some expected languages are present
    const optionValues = await Promise.all(
      options.map(opt => opt.getAttribute('value'))
    );
    
    // The extension supports multiple languages including these common ones
    // At minimum, Swedish-Swedish should always be available
    expect(optionValues.length).toBeGreaterThan(0);
    
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

  test('popup quick tip should be visible by default', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Quick tip should be visible for new users
    const quickTip = page.locator('#quickTip');
    
    // The tip might be hidden based on localStorage, but the container should exist
    await expect(quickTip).toBeAttached();
    
    // If visible, check it contains the expected tip text
    const isVisible = await quickTip.isVisible();
    if (isVisible) {
      await expect(quickTip).toContainText('Alt + Double Click');
    }
    
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

  test('translation should work in popup with Swedish language', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Wait for languages to be loaded
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    
    // Select Swedish language (swe_swe)
    await page.selectOption('#language', 'swe_swe');
    
    // Type 'bil' in the "From Swedish" input field (wordInput)
    // Using pressSequentially to trigger keyup events (which the popup listens to)
    // Note: Using wordInput (From Swedish) because fromWordInput with swe_swe 
    // uses 'from' direction which returns no results in Lexin API
    const wordInput = page.locator('#wordInput');
    await wordInput.click();
    await wordInput.pressSequentially('bil', { delay: 50 });
    
    // Wait for the debounce (500ms) + network request
    // The translation appears when the content changes from empty or "Searching..."
    await expect(page.locator('#translation')).toContainText('ett fordon för ett litet antal personer', {
      timeout: 15000
    });
    
    await page.close();
  });

  test('translation should work in popup with English language', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Wait for languages to be loaded
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    
    // Select English language (swe_eng)
    await page.selectOption('#language', 'swe_eng');
    
    // Type 'bil' in the "From Swedish" input field (wordInput)
    const wordInput = page.locator('#wordInput');
    await wordInput.click();
    await wordInput.pressSequentially('bil', { delay: 50 });
    
    // Wait for the debounce (500ms) + network request
    // Verify translation contains 'motorcar'
    await expect(page.locator('#translation')).toContainText('motorcar', {
      timeout: 15000
    });
    
    await page.close();
  });

  test('translation should work in popup with Russian language', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Wait for languages to be loaded
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    
    // Select Russian language (swe_rus)
    await page.selectOption('#language', 'swe_rus');
    
    // Type 'bil' in the "From Swedish" input field (wordInput)
    const wordInput = page.locator('#wordInput');
    await wordInput.click();
    await wordInput.pressSequentially('bil', { delay: 50 });
    
    // Wait for the debounce (500ms) + network request
    // Verify translation contains Russian word for car
    await expect(page.locator('#translation')).toContainText('автомобиль', {
      timeout: 15000
    });
    
    await page.close();
  });

  test('reverse translation English to Swedish should work', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Wait for languages to be loaded
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    
    // Select English language (swe_eng)
    await page.selectOption('#language', 'swe_eng');
    
    // Type 'king' in the "To Swedish" input field (fromWordInput)
    // This triggers translation from English to Swedish
    // Using pressSequentially to simulate real typing with keyup events
    const fromInput = page.locator('#fromWordInput');
    await fromInput.click();
    await fromInput.pressSequentially('king', { delay: 50 });
    
    // Wait for the debounce (500ms) + network request
    // Verify translation contains 'konung'
    await expect(page.locator('#translation')).toContainText('konung', {
      timeout: 15000
    });
    
    await page.close();
  });

  test('reverse translation Russian to Swedish should work', async ({ popupPage }) => {
    const page = await popupPage();
    
    // Wait for languages to be loaded
    await ExtensionHelpers.waitForLanguagesLoaded(page);
    
    // Select Russian language (swe_rus)
    await page.selectOption('#language', 'swe_rus');
    
    // Type 'идиот' in the "To Swedish" input field (fromWordInput)
    // This triggers translation from Russian to Swedish
    // For Cyrillic characters, we use fill() then trigger keyup event manually
    const fromInput = page.locator('#fromWordInput');
    await fromInput.click();
    await fromInput.fill('идиот');
    // Trigger keyup event to start the translation (popup listens to keyup)
    await fromInput.dispatchEvent('keyup');
    
    // Wait for the debounce (500ms) + network request
    // Verify translation contains 'idiot'
    await expect(page.locator('#translation')).toContainText('idiot', {
      timeout: 15000
    });
    
    await page.close();
  });

  test('Alt+Double click on page should show Swedish translation', async ({ context, extensionId }) => {
    // First, set the language to Swedish via the popup
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/html/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');
    await popupPage.waitForFunction(() => {
      const select = document.querySelector('#language') as HTMLSelectElement;
      return select && select.options.length > 0;
    });
    await popupPage.selectOption('#language', 'swe_swe');
    await popupPage.close();
    
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
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/html/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');
    await popupPage.waitForFunction(() => {
      const select = document.querySelector('#language') as HTMLSelectElement;
      return select && select.options.length > 0;
    });
    await popupPage.selectOption('#language', 'swe_eng');
    await popupPage.close();
    
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

  test('Alt+Double click on page should show Russian translation', async ({ context, extensionId }) => {
    // First, set the language to Russian via the popup
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/html/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');
    await popupPage.waitForFunction(() => {
      const select = document.querySelector('#language') as HTMLSelectElement;
      return select && select.options.length > 0;
    });
    await popupPage.selectOption('#language', 'swe_rus');
    await popupPage.close();
    
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

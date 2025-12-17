import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Chrome extension E2E testing.
 * 
 * Note: Chrome extensions require:
 * - Chromium browser (not Firefox or WebKit)
 * - Headed mode (extensions don't work in headless mode)
 * - Persistent context with the extension loaded
 * 
 * @see https://playwright.dev/docs/chrome-extensions
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in parallel files (but not within the same file for extension tests)
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Limit parallel workers for extension tests (each needs its own browser instance)
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  // Test timeout
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Output directory for test artifacts
  outputDir: 'test-results',
  
  // We don't use webServer since extension tests don't need a server
  // The extension works on any page
  
  use: {
    // Browser settings
    browserName: 'chromium',
    
    // Chrome extensions don't work in headless mode
    headless: false,
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Screenshots on failure
    screenshot: 'only-on-failure',
    
    // Video recording on failure
    video: 'retain-on-failure',
    
    // Trace on first retry
    trace: 'on-first-retry',
  },
  
  // Projects configuration
  projects: [
    {
      name: 'chromium-extension',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});


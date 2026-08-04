import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration for Chrome extension E2E testing.
 *
 * Note: Chrome extensions require:
 * - Chromium browser (not Firefox or WebKit)
 * - Persistent context with the extension loaded
 * - `channel: "chromium"`, which is what makes headless work: the default
 *   chromium build for headless runs is the headless shell, which supports no
 *   extensions at all. The channel runs the full browser in Chrome's newer
 *   headless mode, where they load normally.
 *
 * @see https://playwright.dev/docs/chrome-extensions
 */
export default defineConfig({
  testDir: "./tests/e2e",
  
  // Run tests in parallel files (but not within the same file for extension tests)
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Limit parallel workers for extension tests (each needs its own browser instance)
  workers: 1,
  
  // Reporter configuration
  reporter: process.env.CI
    ? [
        ["html", { outputFolder: "playwright-report" }],
        ["list"],
        ["github"]
      ]
    : [
        ["html", { outputFolder: "playwright-report" }],
        ["list"]
      ],
  
  // Test timeout
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Output directory for test artifacts
  outputDir: "test-results",
  
  // Web server to serve static test pages
  // Content scripts only work on http/https URLs, so we need a local server
  webServer: {
    command: "npx serve tests/e2e/test-pages -p 3456 --no-clipboard",
    port: 3456,
    reuseExistingServer: !process.env.CI,
  },
  
  use: {
    // Browser settings. The channel is load-bearing - see the note above.
    browserName: "chromium",
    channel: "chromium",

    // Headless by default so a run does not open a window and take focus.
    // `npm run test:e2e:headed` (or --headed) still gives you one to watch.
    headless: true,

    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Screenshots on failure
    screenshot: "only-on-failure",
    
    // Video recording on failure
    video: "retain-on-failure",
    
    // Trace on first retry
    trace: "on-first-retry",
  },
  
  // Projects configuration
  projects: [
    {
      name: "chromium-extension",
      use: {
        browserName: "chromium",
      },
    },
  ],
});


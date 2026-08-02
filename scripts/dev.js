#!/usr/bin/env node
// One-command development loop: rebuild on save, reload the extension in Chrome, and
// reload whatever pages are open - so a change is visible without the trip to
// chrome://extensions and back.
//
// Usage: npm run dev
//        CHROME_CHANNEL=chrome npm run dev   (real Chrome instead of Playwright's
//                                             bundled Chromium)
//
// Playwright is used purely as a browser driver here; nothing about this file is a
// test. It loads the extension the same way tests/e2e/fixtures.ts does, so what you
// see by hand and what the E2E suite sees are the same browser and the same dist/.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { watch } from "../build.js";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
// build.js addresses src/ and dist/ relatively, and the static server is started with
// a relative root, so both need the project root as the working directory.
process.chdir(ROOT);

const DIST = path.join(ROOT, "dist");
// A profile of its own, kept between runs: the extension's stored settings and
// history survive a restart, and so do the open tabs and the window position.
const PROFILE = path.join(ROOT, ".chrome-dev-profile");
// The port tests/e2e serves its static pages on. Content scripts do not run on
// file:// URLs, so a page to Alt+Click has to come over http.
const TEST_PAGE_PORT = 3456;
const TEST_PAGE_URL = `http://localhost:${TEST_PAGE_PORT}/swedish-text.html`;
// A save usually settles several bundles at once; wait for the flurry to end.
const REBUILD_DEBOUNCE_MS = 150;

const ignore = () => {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
  });
}

/** Serves tests/e2e/test-pages, reusing whatever is already on the port. */
async function startTestPageServer() {
  if (await isListening(TEST_PAGE_PORT)) {
    return null;
  }

  const server = spawn(
    path.join(ROOT, "node_modules/.bin/serve"),
    ["tests/e2e/test-pages", "-p", String(TEST_PAGE_PORT), "--no-clipboard"],
    { cwd: ROOT, stdio: "ignore" }
  );

  for (let attempt = 0; attempt < 50; attempt++) {
    if (await isListening(TEST_PAGE_PORT)) { return server; }
    await sleep(100);
  }

  console.warn(`Static server did not come up on port ${TEST_PAGE_PORT}.`);
  return server;
}

async function launchChrome() {
  return chromium.launchPersistentContext(PROFILE, {
    headless: false,
    // Undefined falls back to the Chromium Playwright ships, which is also what the
    // E2E suite runs against.
    channel: process.env.CHROME_CHANNEL,
    // Use the real window size rather than a fixed test viewport.
    viewport: null,
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      "--no-first-run",
      "--disable-default-apps",
      "--disable-popup-blocking",
      "--disable-translate",
    ],
  });
}

/**
 * Reloads the extension from disk, the way the Reload button on chrome://extensions
 * does, and returns its ID - which is derived from dist/'s path and so is the same
 * every time. Takes about 20ms.
 *
 * Not chrome.runtime.reload(): an extension that Chrome loaded from the command line
 * (--load-extension, which is how both this script and the E2E fixture load it) is
 * *unloaded* by that call and never comes back. The window is left with no service
 * worker and every chrome-extension:// URL answering ERR_BLOCKED_BY_CLIENT, so a
 * loop built on it silently serves a dead extension. Extensions.loadUnpacked is a
 * genuine reload, and re-reads the manifest too.
 */
async function reloadExtension(cdp) {
  const { id } = await cdp.send("Extensions.loadUnpacked", { path: DIST });
  return id;
}

/**
 * Puts back what the reload disturbed.
 *
 * Extension pages do not survive it - their tabs are torn down outright - so they
 * are reopened rather than reloaded. Ordinary pages do survive, but a content script
 * is only injected on navigation, so one that was open across the reload is still
 * running the previous build until it loads again.
 */
async function restorePages(context, openUrls) {
  await Promise.all(context.pages().map(async (page) => {
    if (page.isClosed() || !/^https?:/.test(page.url())) { return; }
    await page.reload({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(ignore);
  }));

  const stillOpen = new Set(context.pages().map((page) => page.url()));
  for (const url of openUrls) {
    if (!url.startsWith("chrome-extension://") || stillOpen.has(url)) { continue; }

    const page = await context.newPage();
    // The extension can need a moment more than the reload call itself; one retry is
    // enough to cover it.
    await page.goto(url).catch(async () => {
      await sleep(250);
      await page.goto(url).catch(ignore);
    });
  }
}

async function main() {
  const server = await startTestPageServer();

  // Wired up before the browser launches, but held back by `ready` until it is up:
  // the initial build fires onRebuild once per surface and there is nothing to
  // reload yet.
  let ready = false;
  let pending = null;
  let queue = Promise.resolve();
  let context = null;
  let cdp = null;

  const stopWatching = await watch((errors) => {
    if (!ready || errors.length > 0) { return; }

    clearTimeout(pending);
    pending = setTimeout(() => {
      queue = queue.then(async () => {
        if (!cdp) {
          log("rebuilt dist/ - reload the extension yourself to pick it up");
          return;
        }

        const started = Date.now();
        const openUrls = context.pages().map((page) => page.url());
        await reloadExtension(cdp);
        await restorePages(context, openUrls);
        log(`reloaded extension in ${Date.now() - started}ms`);
      }).catch((error) => console.error(error));
    }, REBUILD_DEBOUNCE_MS);
  });

  context = await launchChrome();

  // Reloading needs a browser-level CDP session; a page-level one rejects the
  // Extensions domain. Establish it now rather than on the first save, so a Chrome
  // too old to support it is reported before any time is spent editing.
  //
  // context.browser() is documented to return null for a persistent context, but
  // has returned the Browser for years and does so in the version pinned here - the
  // docs are what is out of date. It is called inside the try for the day that
  // changes: the loop then degrades to rebuild-only with the warning below, rather
  // than dying at startup.
  let extensionId;
  try {
    cdp = await context.browser().newBrowserCDPSession();
    extensionId = await reloadExtension(cdp);
  } catch (error) {
    cdp = null;
    console.warn(`
Automatic reloading is unavailable: ${String(error).split("\n")[0]}
Rebuilds will still happen; reload the extension from chrome://extensions.
`);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    extensionId = worker.url().split("/")[2];
  }

  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(TEST_PAGE_URL).catch(ignore);

  console.log(`
Extension loaded from dist/ - id ${extensionId}

  Action Popup   chrome-extension://${extensionId}/html/popup.html
  Options Page   chrome-extension://${extensionId}/html/options.html
  History Page   chrome-extension://${extensionId}/html/history.html
  Help Page      chrome-extension://${extensionId}/html/help.html
  Test page      ${TEST_PAGE_URL}

The ID is derived from dist/'s path, so those URLs keep working across reloads and
restarts - they are worth bookmarking.

Saving anything in src/ rebuilds dist/ and reloads the extension and every open page.
Types are not checked here - run \`npm run typecheck\` for that.
Ctrl+C, or closing the browser, stops.
`);

  ready = true;

  let closing = false;
  const shutdown = async () => {
    if (closing) { return; }
    closing = true;

    clearTimeout(pending);
    await stopWatching();
    await context.close().catch(ignore);
    server?.kill();
    process.exit(0);
  };

  context.on("close", () => { void shutdown(); });
  process.on("SIGINT", () => { void shutdown(); });
  process.on("SIGTERM", () => { void shutdown(); });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

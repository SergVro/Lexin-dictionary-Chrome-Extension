#!/usr/bin/env node
// Submits a packaged release ZIP to the Chrome Web Store: preflight status
// check, upload, bounded poll on UPLOAD_IN_PROGRESS, then publish.
//
// Usage: node scripts/webstore/publish.js <zipPath> <version>
//
// Required environment variables:
//   CWS_ACCESS_TOKEN  - OAuth access token scoped to chromewebstore
//   CWS_PUBLISHER_ID  - Chrome Web Store publisher id
//   CWS_EXTENSION_ID  - Chrome Web Store item id
import { appendFile, readFile } from "node:fs/promises";
import {
  fetchStatus,
  assertReleasable,
  uploadPackage,
  pollUploadState,
  publishItem
} from "./chrome-web-store.js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

// The API guide documents UPLOAD_IN_PROGRESS as the state to poll on but does
// not enumerate every terminal value, so failure is detected by pattern
// rather than an exact allow-list of success states.
function assertUploadSucceeded(state, context) {
  if (!state || state === "UPLOAD_IN_PROGRESS") {
    return;
  }
  if (/FAIL|ERROR/i.test(state)) {
    throw new Error(`Upload did not succeed (${context}): ${state}`);
  }
}

async function writeSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  const text = lines.join("\n") + "\n";
  if (summaryPath) {
    await appendFile(summaryPath, text, "utf-8");
  } else {
    console.log(text);
  }
}

async function main() {
  const [zipPath, version] = process.argv.slice(2);
  if (!zipPath || !version) {
    throw new Error("Usage: node scripts/webstore/publish.js <zipPath> <version>");
  }

  const accessToken = requireEnv("CWS_ACCESS_TOKEN");
  const publisherId = requireEnv("CWS_PUBLISHER_ID");
  const extensionId = requireEnv("CWS_EXTENSION_ID");
  const checksum = (await readFile(`${zipPath}.sha256`, "utf-8")).split(/\s+/)[0];

  console.log(`Fetching current release status for ${extensionId}...`);
  const preflightStatus = await fetchStatus({ accessToken, publisherId, extensionId });
  assertReleasable(preflightStatus, version);

  console.log(`Uploading ${zipPath}...`);
  let uploadResult = await uploadPackage({ accessToken, publisherId, extensionId, zipPath });
  assertUploadSucceeded(uploadResult.uploadState, "upload response");

  if (uploadResult.uploadState === "UPLOAD_IN_PROGRESS") {
    console.log("Upload still processing, polling for completion...");
    const polledStatus = await pollUploadState({ accessToken, publisherId, extensionId });
    assertUploadSucceeded(polledStatus.lastAsyncUploadState, "polled status");
  }

  console.log("Submitting for publication...");
  const publishResult = await publishItem({ accessToken, publisherId, extensionId });

  await writeSummary([
    "## Chrome Web Store release",
    "",
    `- **Version:** ${version}`,
    `- **Package:** \`${zipPath}\``,
    `- **SHA-256:** \`${checksum}\``,
    `- **Extension ID:** \`${extensionId}\``,
    `- **Submission state:** \`${publishResult.state ?? "unknown"}\``,
    ...(publishResult.warningInfo?.warnings?.length
      ? [
          "",
          "### Warnings",
          ...publishResult.warningInfo.warnings.map(
            (warning) => `- ${warning.reason}: ${warning.description}`
          )
        ]
      : [])
  ]);

  console.log(`Release ${version} submitted with state: ${publishResult.state ?? "unknown"}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

// Thin client for the Chrome Web Store API v2.
// https://developer.chrome.com/docs/webstore/using-api
import { readFile } from "node:fs/promises";
import { compareChromeVersions } from "./version.js";

const API_ROOT = "https://chromewebstore.googleapis.com";

function itemPath(publisherId, extensionId) {
  return `publishers/${publisherId}/items/${extensionId}`;
}

async function callApi(url, { accessToken, method = "GET", headers = {}, body }) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...headers
    },
    body
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${method} ${url} returned non-JSON response (${response.status}): ${text}`);
  }

  if (!response.ok) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

/**
 * Fetches the current publish/upload status of the item.
 */
export async function fetchStatus({ accessToken, publisherId, extensionId }) {
  const url = `${API_ROOT}/v2/${itemPath(publisherId, extensionId)}:fetchStatus`;
  return callApi(url, { accessToken });
}

/**
 * Inspects a fetchStatus response and rejects releases that must not proceed:
 * a taken-down or policy-warned item, a submission already awaiting review
 * (which the new upload would conflict with), or a target version that does
 * not strictly increment the currently published version.
 */
export function assertReleasable(status, targetVersion) {
  const problems = [];

  if (status.takenDown) {
    problems.push("the item has been taken down for a policy violation");
  }

  if (status.warned) {
    problems.push("the item has an active policy warning");
  }

  if (status.submittedItemRevisionStatus) {
    problems.push(
      "a previous submission is still awaiting review and would conflict with this upload"
    );
  }

  const publishedChannels = status.publishedItemRevisionStatus?.distributionChannels ?? [];
  const publishedVersion = publishedChannels
    .map((channel) => channel.crxVersion)
    .filter(Boolean)
    .sort(compareChromeVersions)
    .pop();

  if (publishedVersion && compareChromeVersions(targetVersion, publishedVersion) <= 0) {
    problems.push(
      `target version ${targetVersion} does not increment the published version ${publishedVersion}`
    );
  }

  if (problems.length > 0) {
    throw new Error(`Release blocked by preflight check: ${problems.join("; ")}`);
  }
}

/**
 * Uploads the package. May return with uploadState "UPLOAD_IN_PROGRESS" for
 * large or queued uploads - callers should follow up with pollUploadState.
 */
export async function uploadPackage({ accessToken, publisherId, extensionId, zipPath }) {
  const url = `${API_ROOT}/upload/v2/${itemPath(publisherId, extensionId)}:upload`;
  const zipBuffer = await readFile(zipPath);
  return callApi(url, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: zipBuffer
  });
}

/**
 * Polls fetchStatus until the most recent async upload leaves the
 * "UPLOAD_IN_PROGRESS" state, or the attempt budget is exhausted.
 */
export async function pollUploadState({
  accessToken,
  publisherId,
  extensionId,
  maxAttempts = 10,
  intervalMs = 15000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
}) {
  let lastStatus;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await sleep(intervalMs);
    lastStatus = await fetchStatus({ accessToken, publisherId, extensionId });

    if (lastStatus.lastAsyncUploadState !== "UPLOAD_IN_PROGRESS") {
      return lastStatus;
    }
  }

  throw new Error(
    `Upload still in progress after ${maxAttempts} attempts (${maxAttempts * intervalMs}ms) - last status: ${JSON.stringify(lastStatus)}`
  );
}

/**
 * Submits the uploaded revision for publication. Google publishes it
 * automatically once its review succeeds (publishType DEFAULT_PUBLISH).
 */
export async function publishItem({
  accessToken,
  publisherId,
  extensionId,
  publishType = "DEFAULT_PUBLISH",
  blockOnWarnings = true
}) {
  const url = `${API_ROOT}/v2/${itemPath(publisherId, extensionId)}:publish`;
  return callApi(url, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publishType, blockOnWarnings })
  });
}

#!/usr/bin/env node
// Sanity-checks a packaged release ZIP before it is uploaded: manifest.json
// must sit at the ZIP root, carry the tag-derived version, and the expected
// top-level extension folders must be present.
//
// Usage: node scripts/webstore/inspect-zip.js <zipPath> <expectedVersion>
import { execFileSync } from "node:child_process";
import { validateChromeVersion } from "./version.js";

const REQUIRED_ENTRIES = ["manifest.json", "css/", "html/", "icons/", "scripts/"];

function listEntries(zipPath) {
  return execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);
}

function readManifest(zipPath) {
  return JSON.parse(execFileSync("unzip", ["-p", zipPath, "manifest.json"], { encoding: "utf-8" }));
}

function main() {
  const [zipPath, expectedVersion] = process.argv.slice(2);
  if (!zipPath || !expectedVersion) {
    throw new Error("Usage: node scripts/webstore/inspect-zip.js <zipPath> <expectedVersion>");
  }

  validateChromeVersion(expectedVersion);

  const entries = listEntries(zipPath);

  if (!entries.includes("manifest.json")) {
    throw new Error("manifest.json is not present at the ZIP root");
  }

  for (const required of REQUIRED_ENTRIES) {
    if (!entries.some((entry) => entry === required || entry.startsWith(required))) {
      throw new Error(`Expected entry "${required}" is missing from the ZIP`);
    }
  }

  const manifest = readManifest(zipPath);
  if (manifest.version !== expectedVersion) {
    throw new Error(
      `ZIP manifest version "${manifest.version}" does not match tag-derived version "${expectedVersion}"`
    );
  }

  console.log(`ZIP inspection OK: manifest.json version ${manifest.version} at root, ${entries.length} entries`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

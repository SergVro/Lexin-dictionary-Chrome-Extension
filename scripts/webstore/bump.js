#!/usr/bin/env node
// Stamps a release version into the files that are committed to the repo:
// src/manifest.json, package.json and package-lock.json.
//
// Usage: npm run release:version -- <version|tag>   (3.1.0 or v3.1.0)
//
// This writes the files and stops there. `npm run release` (release.js) is the
// one to reach for when actually cutting a release - it calls this, then
// commits, tags and pushes.
//
// Either way the version lands before the tag, so the tag names a commit whose
// manifest already carries the version being released. The release workflow's
// preflight (verify-version.js) enforces that, which is what keeps the two from
// drifting apart the way they did up to 3.0.0 - src/manifest.json was bumped by hand and
// package.json sat at 1.8.0 for four releases, so every build and test log
// announced a version the extension had long left behind.
//
// This is the only place src/manifest.json's version is written. Packaging
// (package.js) still stamps the tag version into dist/manifest.json rather than
// trusting the committed one, so a release ZIP always matches its tag even if
// something here was skipped.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTagVersion, toPackageVersion, validateChromeVersion } from "./version.js";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MANIFEST_FILE = path.join("src", "manifest.json");
export const PACKAGE_FILE = "package.json";
export const LOCK_FILE = "package-lock.json";

/**
 * Accepts either a bare version ("3.1.0") or a release tag ("v3.1.0") and
 * returns the validated version.
 *
 * A bare version is routed through parseTagVersion as well, so it is held to
 * the same X.Y.Z(.W) shape the tag will need. Chrome would accept "3.1", but
 * the tag it becomes - `v3.1` - does not match release.yml's `v*.*.*` trigger:
 * pushing it would silently run nothing at all. Better to fail here.
 */
export function resolveVersionInput(input) {
  if (typeof input !== "string") {
    throw new Error(`Version must be a string, got ${typeof input}`);
  }

  const trimmed = input.trim();
  const tag = trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
  return validateChromeVersion(parseTagVersion(tag));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

// npm writes both JSON files with two-space indentation and a trailing newline,
// so rewriting them this way leaves no formatting diff for `npm install` to undo.
async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * Reads the versions currently committed to the repo.
 */
export async function readVersions(root = REPO_ROOT) {
  const [manifest, pkg, lock] = await Promise.all([
    readJson(path.join(root, MANIFEST_FILE)),
    readJson(path.join(root, PACKAGE_FILE)),
    readJson(path.join(root, LOCK_FILE))
  ]);

  return {
    manifest: manifest.version,
    package: pkg.version,
    // lockfileVersion 2+ repeats the root package's version under packages[""].
    // npm rewrites it from package.json on the next install, so leaving it stale
    // would surface as an unrelated diff in someone else's PR.
    lock: lock.version,
    lockPackage: lock.packages?.[""]?.version
  };
}

/**
 * Writes `version` into the manifest and the npm files, and returns what each
 * held before.
 */
export async function applyVersion(version, root = REPO_ROOT) {
  const manifestVersion = validateChromeVersion(version);
  const packageVersion = toPackageVersion(manifestVersion);
  const previous = await readVersions(root);

  const manifestPath = path.join(root, MANIFEST_FILE);
  const manifest = await readJson(manifestPath);
  manifest.version = manifestVersion;
  await writeJson(manifestPath, manifest);

  const packagePath = path.join(root, PACKAGE_FILE);
  const pkg = await readJson(packagePath);
  pkg.version = packageVersion;
  await writeJson(packagePath, pkg);

  const lockPath = path.join(root, LOCK_FILE);
  const lock = await readJson(lockPath);
  lock.version = packageVersion;
  if (lock.packages?.[""]) {
    lock.packages[""].version = packageVersion;
  }
  await writeJson(lockPath, lock);

  return { manifestVersion, packageVersion, previous };
}

async function main() {
  const input = process.env.RELEASE_VERSION || process.argv[2];
  if (!input) {
    throw new Error("Usage: npm run release:version -- <version>   (e.g. 3.1.0)");
  }

  const version = resolveVersionInput(input);
  const { manifestVersion, packageVersion, previous } = await applyVersion(version);

  console.log(`${MANIFEST_FILE}: ${previous.manifest} -> ${manifestVersion}`);
  console.log(`${PACKAGE_FILE}: ${previous.package} -> ${packageVersion}`);
  console.log(`${LOCK_FILE}: ${previous.lock} -> ${packageVersion}`);
  console.log("");
  console.log("Files only - commit and tag yourself, or let `npm run release` do all of it.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

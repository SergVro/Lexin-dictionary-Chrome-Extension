#!/usr/bin/env node
// Checks that the versions committed to the repo match the tag being released.
//
// Usage: node scripts/webstore/verify-version.js <tag>
//
// The release workflow runs this before anything is built, so a tag pushed
// without running `npm run release:version` first fails in seconds rather than
// shipping a store submission whose repo says otherwise. The check is on the
// committed files only - packaging stamps dist/manifest.json from the tag
// regardless, so this is about the repo telling the truth, not about the ZIP.
import { readVersions, MANIFEST_FILE, PACKAGE_FILE, LOCK_FILE } from "./bump.js";
import { parseTagVersion, toPackageVersion } from "./version.js";

/**
 * Returns the mismatches between a tag's version and the committed versions,
 * as one human-readable line each. An empty array means everything agrees.
 */
export function findVersionMismatches(tag, versions) {
  const manifestVersion = parseTagVersion(tag);
  const packageVersion = toPackageVersion(manifestVersion);
  const mismatches = [];

  if (versions.manifest !== manifestVersion) {
    mismatches.push(`${MANIFEST_FILE} says "${versions.manifest}", tag ${tag} means "${manifestVersion}"`);
  }

  if (versions.package !== packageVersion) {
    mismatches.push(`${PACKAGE_FILE} says "${versions.package}", tag ${tag} means "${packageVersion}"`);
  }

  if (versions.lock !== packageVersion || versions.lockPackage !== packageVersion) {
    mismatches.push(
      `${LOCK_FILE} says "${versions.lock}"/"${versions.lockPackage}", tag ${tag} means "${packageVersion}"`
    );
  }

  return mismatches;
}

async function main() {
  const tag = process.env.RELEASE_TAG || process.argv[2];
  if (!tag) {
    throw new Error("Usage: node scripts/webstore/verify-version.js <tag>");
  }

  const versions = await readVersions();
  const mismatches = findVersionMismatches(tag, versions);

  if (mismatches.length > 0) {
    const version = parseTagVersion(tag);
    throw new Error(
      [
        "The committed versions do not match the tag being released:",
        ...mismatches.map((line) => `  - ${line}`),
        "",
        `Fix it on the release branch with \`npm run release:version -- ${version}\`,`,
        `commit, then re-tag ${tag} at that commit.`
      ].join("\n")
    );
  }

  console.log(`Version check OK: ${tag} matches ${MANIFEST_FILE}, ${PACKAGE_FILE} and ${LOCK_FILE}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

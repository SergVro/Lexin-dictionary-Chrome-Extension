// Chrome's manifest "version" rules: https://developer.chrome.com/docs/extensions/reference/manifest/version
// 1-4 dot-separated integers, each 0-65535, no leading zeros on non-zero integers,
// and the components must not all be zero.
export const CHROME_VERSION_MAX_COMPONENTS = 4;
export const CHROME_VERSION_COMPONENT_MAX = 65535;
// npm's package.json version is semver: exactly major.minor.patch.
export const PACKAGE_VERSION_COMPONENTS = 3;

/**
 * Extracts the raw version string from a release tag.
 * Only vX.Y.Z and vX.Y.Z.W tags are accepted, matching the shape produced by
 * `git tag vX.Y.Z` / `git tag vX.Y.Z.W`.
 */
export function parseTagVersion(tag) {
  if (typeof tag !== "string") {
    throw new Error(`Tag must be a string, got ${typeof tag}`);
  }

  const match = /^v(\d+\.\d+\.\d+(?:\.\d+)?)$/.exec(tag.trim());
  if (!match) {
    throw new Error(
      `Tag "${tag}" does not match the required vX.Y.Z or vX.Y.Z.W format`
    );
  }

  return match[1];
}

/**
 * Validates a version string against Chrome's manifest version rules.
 * Returns the same version string when valid, throws a descriptive error otherwise.
 */
export function validateChromeVersion(version) {
  const parts = version.split(".");

  if (parts.length < 1 || parts.length > CHROME_VERSION_MAX_COMPONENTS) {
    throw new Error(
      `Chrome extension version must have 1 to ${CHROME_VERSION_MAX_COMPONENTS} components, got "${version}"`
    );
  }

  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      throw new Error(
        `Chrome extension version component "${part}" in "${version}" must be a non-negative integer`
      );
    }

    if (part.length > 1 && part.startsWith("0")) {
      throw new Error(
        `Chrome extension version component "${part}" in "${version}" must not have a leading zero`
      );
    }

    const value = Number(part);
    if (value < 0 || value > CHROME_VERSION_COMPONENT_MAX) {
      throw new Error(
        `Chrome extension version component "${part}" in "${version}" must be between 0 and ${CHROME_VERSION_COMPONENT_MAX}`
      );
    }
  }

  if (parts.every((part) => Number(part) === 0)) {
    throw new Error(`Chrome extension version "${version}" must not be all zero`);
  }

  return version;
}

/**
 * Parses a release tag and validates the resulting version against Chrome's rules.
 */
export function resolveReleaseVersion(tag) {
  return validateChromeVersion(parseTagVersion(tag));
}

/**
 * Converts a Chrome manifest version into the three-component form npm requires
 * in package.json.
 *
 * Chrome allows 1 to 4 components; semver allows exactly 3. Missing components
 * are padded with zeros, and a fourth - Chrome's rebuild counter, which npm has
 * no equivalent of - is dropped: "3.1" becomes "3.1.0", "3.1.0.2" becomes
 * "3.1.0". Two releases that differ only in that fourth component therefore
 * share a package.json version, which is fine - nothing here is published to
 * npm, the field exists to label build and test output.
 */
export function toPackageVersion(version) {
  const parts = validateChromeVersion(version).split(".");

  while (parts.length < PACKAGE_VERSION_COMPONENTS) {
    parts.push("0");
  }

  return parts.slice(0, PACKAGE_VERSION_COMPONENTS).join(".");
}

/**
 * Compares two Chrome extension versions the way Chrome does: component by
 * component, left to right, treating a missing trailing component as zero.
 * Returns a negative number, zero, or a positive number.
 */
export function compareChromeVersions(a, b) {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

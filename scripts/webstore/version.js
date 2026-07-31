// Chrome's manifest "version" rules: https://developer.chrome.com/docs/extensions/reference/manifest/version
// 1-4 dot-separated integers, each 0-65535, no leading zeros on non-zero integers,
// and the components must not all be zero.
export const CHROME_VERSION_MAX_COMPONENTS = 4;
export const CHROME_VERSION_COMPONENT_MAX = 65535;

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

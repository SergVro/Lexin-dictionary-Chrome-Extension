#!/usr/bin/env node
// Packages dist/ into a deterministic release ZIP for the Chrome Web Store.
//
// Usage: node scripts/webstore/package.js <tag>
// (or set RELEASE_TAG in the environment instead of passing an argument)
//
// The tag's version is written to dist/manifest.json only - src/manifest.json
// is never touched, so this script is safe to run repeatedly against the same
// build output.
import { createHash } from "node:crypto";
import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";
import { resolveReleaseVersion } from "./version.js";

const DIST_DIR = "dist";
// A fixed timestamp keeps the ZIP's per-entry metadata identical across runs
// of the same tag/commit, so the packaging step is reproducible.
const DETERMINISTIC_DATE = new Date(0);

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await collectFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function applyVersionToDistManifest(version) {
  const manifestPath = path.join(DIST_DIR, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  manifest.version = version;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

async function createZip(zipName) {
  const relativeFiles = (await collectFiles(DIST_DIR))
    .map((filePath) => path.relative(DIST_DIR, filePath))
    .sort();

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipName);
    // statConcurrency defaults to 4: with more than one worker, file stats
    // resolve (and are queued into the archive) in completion order rather
    // than call order, making the resulting ZIP's entry order - and bytes -
    // non-deterministic across runs. Force it to 1 for reproducible output.
    const archive = new ZipArchive({ zlib: { level: 9 }, statConcurrency: 1 });

    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    for (const relativePath of relativeFiles) {
      archive.file(path.join(DIST_DIR, relativePath), {
        name: relativePath,
        date: DETERMINISTIC_DATE
      });
    }

    archive.finalize().catch(reject);
  });

  return relativeFiles;
}

async function writeChecksum(zipName) {
  const zipBuffer = await fs.readFile(zipName);
  const checksum = createHash("sha256").update(zipBuffer).digest("hex");
  const checksumFile = `${zipName}.sha256`;
  await fs.writeFile(checksumFile, `${checksum}  ${zipName}\n`, "utf-8");
  return { checksum, checksumFile };
}

export async function packageRelease(tag) {
  const version = resolveReleaseVersion(tag);
  await applyVersionToDistManifest(version);

  const zipName = `lexin-extension-${version}.zip`;
  const files = await createZip(zipName);
  const { checksum, checksumFile } = await writeChecksum(zipName);

  return { version, zipName, checksumFile, checksum, files };
}

async function main() {
  const tag = process.env.RELEASE_TAG || process.argv[2];
  if (!tag) {
    throw new Error("Usage: node scripts/webstore/package.js <tag> (or set RELEASE_TAG)");
  }

  const result = await packageRelease(tag);
  console.log(`Version: ${result.version}`);
  console.log(`Package: ${result.zipName}`);
  console.log(`SHA-256: ${result.checksum}`);
  console.log(`Checksum file: ${result.checksumFile}`);
  console.log(`Files (${result.files.length}):`);
  for (const file of result.files) {
    console.log(`  ${file}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

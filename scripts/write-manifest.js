// Writes dist/manifest.json (stamped with the build time) as part of `build:copy`.
// The logic lives in writeManifest() so watch mode and the release build share it;
// this thin wrapper just lets the npm script invoke it as its own step.
import { writeManifest } from "../build.js";

writeManifest().catch((error) => {
  console.error(error);
  process.exit(1);
});

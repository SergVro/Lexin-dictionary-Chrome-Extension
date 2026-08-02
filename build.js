import * as esbuild from 'esbuild';
import { promises as fs, watch as watchPath } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * The six surfaces, named as they sit under scripts/. Each is bundled into a
 * self-contained IIFE at dist/scripts/<name>.js - which is why nothing needs to be
 * listed in web_accessible_resources. See ManifestTests.
 *
 * The release build feeds esbuild the JavaScript tsc has already emitted into
 * dist/temp; watch mode feeds it the TypeScript in src/ directly, which is what
 * makes a rebuild take milliseconds rather than seconds. esbuild only strips the
 * types either way, so the two agree on output - but only the release build type
 * checks. That is what `npm run typecheck` is for.
 */
const surfaces = [
  'worker/background-main',
  'popup/popup-main',
  'options/options-main',
  'history/history-main',
  'help-main',
  'content/content-main'
];

const compiledEntryPoints = surfaces.map((surface) => `dist/temp/scripts/${surface}.js`);
const sourceEntryPoints = surfaces.map((surface) => `src/scripts/${surface}.ts`);

/** Everything under src/ that ships as-is rather than being compiled. */
const assetDirectories = ['css', 'html', 'icons'];

/**
 * Resolves `.css` imports back to src/css/ and inlines them as strings.
 *
 * The Translation Card renders in a shadow root, which cannot be styled by a
 * <link> without web_accessible_resources - forbidden by ManifestTests. So its
 * CSS travels inside the content script bundle instead. See
 * docs/adr/0001-shadow-dom-for-translation-card.md.
 *
 * The remapping is needed because tsc emits import specifiers untouched while
 * bundling happens from dist/temp/, where no css/ directory exists.
 */
const cssTextPlugin = {
  name: 'css-text',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => ({
      path: path.resolve('src/css', path.basename(args.path))
    }));
  }
};

/**
 * Bundles land in the root of dist/scripts/, not in the subfolder their entry point
 * came from: dist/temp/scripts/worker/background-main.js -> dist/scripts/background-main.js
 */
function bundleOptions(entry) {
  const name = path.basename(entry, path.extname(entry));

  return {
    entryPoints: [entry],
    bundle: true,
    outfile: `dist/scripts/${name}.js`,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    globalName: name.replace(/-/g, '_'),
    plugins: [cssTextPlugin],
    loader: { '.css': 'text' },
  };
}

async function build() {
  try {
    console.log('Building extension...');

    // Build main entry points with esbuild
    for (const entry of compiledEntryPoints) {
      const options = bundleOptions(entry);
      await esbuild.build(options);
      console.log(`Built ${entry} -> ${options.outfile}`);
    }

    // Copy all other compiled JS files that aren't entry points
    async function copyDir(src, dest) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await copyDir(srcPath, destPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          // Skip entry point files (already bundled)
          const isEntryPoint = compiledEntryPoints.some(ep =>
            ep.includes(entry.name) ||
            srcPath.includes(entry.name.replace('.js', '-main.js'))
          );

          if (!isEntryPoint) {
            await fs.copyFile(srcPath, destPath);
          }
        }
      }
    }

    await copyDir('dist/temp/scripts', 'dist/scripts');
    console.log('Copied additional script files');

    // Clean up temp directory
    await fs.rm('dist/temp', { recursive: true, force: true });
    console.log('Cleaned up temp files');

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

/**
 * Makes `destination` match `source`, deleting anything in it that the source no
 * longer has.
 *
 * A plain recursive copy would only ever merge, so a deleted or renamed asset would
 * live on in dist/ - and an extension that still works in the dev loop because it is
 * being served a file the release build omits is exactly the kind of breakage this
 * loop exists to catch early. The release build sidesteps this by starting from
 * `rm -rf dist`, which watch mode cannot do while Chrome has dist/ loaded.
 */
async function mirrorDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });

  const sourceEntries = await fs.readdir(source, { withFileTypes: true });
  const destinationEntries = await fs.readdir(destination, { withFileTypes: true })
    .catch(() => []);

  const sourceNames = new Set(sourceEntries.map((entry) => entry.name));
  for (const entry of destinationEntries) {
    if (!sourceNames.has(entry.name)) {
      await fs.rm(path.join(destination, entry.name), { recursive: true, force: true });
    }
  }

  for (const entry of sourceEntries) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await mirrorDirectory(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

/**
 * The JavaScript half of the `build:copy` script, for watch mode - which cannot
 * shell out to `cp` on every keystroke and, more importantly, must never delete
 * dist/ while Chrome has the unpacked extension loaded from it.
 *
 * Only the asset directories are mirrored. dist/scripts/ belongs to esbuild and
 * dist/manifest.json is written straight from src.
 */
export async function syncAssets() {
  for (const directory of assetDirectories) {
    await mirrorDirectory(`src/${directory}`, `dist/${directory}`);
  }
  await fs.copyFile('src/manifest.json', 'dist/manifest.json');
}

/**
 * Rebuilds dist/ in place as src/ changes, calling `onRebuild` with esbuild's
 * errors (an empty array when the build succeeded) each time it settles.
 *
 * Returns a function that stops watching. Note that a single save can settle
 * several times over, once per surface whose bundle contains the changed file -
 * callers are expected to debounce.
 */
export async function watch(onRebuild = () => {}) {
  await syncAssets();

  const notifyPlugin = {
    name: 'notify',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length > 0) {
          const formatted = await esbuild.formatMessages(result.errors, {
            kind: 'error', color: true, terminalWidth: process.stdout.columns
          });
          console.error(formatted.join('\n'));
        }
        onRebuild(result.errors);
      });
    }
  };

  const contexts = await Promise.all(sourceEntryPoints.map((entry) => esbuild.context({
    ...bundleOptions(entry),
    plugins: [cssTextPlugin, notifyPlugin],
    logLevel: 'silent'
  })));

  await Promise.all(contexts.map((context) => context.watch()));

  // esbuild only watches what its bundles import, which leaves out everything that
  // is copied rather than compiled - including the manifest, where a change is
  // exactly the kind that needs a reload to take effect.
  const assetWatcher = watchPath('src', { recursive: true }, (_event, filename) => {
    if (!filename) { return; }

    // Matched on location rather than on extension, so that a rename or a delete -
    // which fs.watch reports against the path that vanished, directories included -
    // is handled the same as an edit.
    const changed = filename.split(path.sep).join('/');
    const isAsset = changed === 'manifest.json'
      || assetDirectories.some((directory) => changed.startsWith(`${directory}/`));
    if (!isAsset) { return; }

    syncAssets().then(() => onRebuild([])).catch((error) => console.error(error));
  });

  return async () => {
    assetWatcher.close();
    await Promise.all(contexts.map((context) => context.dispose()));
  };
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  if (process.argv.includes('--watch')) {
    await watch((errors) => {
      if (errors.length === 0) {
        console.log(`[${new Date().toLocaleTimeString()}] rebuilt dist/`);
      }
    });
    console.log('Watching src/ for changes. Ctrl+C to stop.');
  } else {
    await build();
  }
}

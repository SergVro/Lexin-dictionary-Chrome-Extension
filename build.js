import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

// Entry points that need bundling
const bundledEntryPoints = [
  'dist/temp/scripts/worker/background-main.js',
  'dist/temp/scripts/popup/popup-main.js',
  'dist/temp/scripts/options/options-main.js',
  'dist/temp/scripts/history/history-main.js',
  'dist/temp/scripts/help-main.js',
  'dist/temp/scripts/content/content-main.js'
];

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

async function build() {
  try {
    console.log('Building extension...');

    // Build main entry points with esbuild
    for (const entry of bundledEntryPoints) {
      // Output bundled files to root of dist/scripts/ (not in subfolders)
      // e.g., dist/temp/scripts/worker/background-main.js -> dist/scripts/background-main.js
      const entryName = path.basename(entry);
      const outfile = `dist/scripts/${entryName}`;
      
      await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        outfile: outfile,
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        globalName: path.basename(entry, '.js').replace(/-/g, '_'),
        plugins: [cssTextPlugin],
        loader: { '.css': 'text' },
      });
      
      console.log(`Built ${entry} -> ${outfile}`);
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
          const isEntryPoint = bundledEntryPoints.some(ep => 
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

build();

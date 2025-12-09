import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

// Entry points that need bundling
const bundledEntryPoints = [
  'dist/temp/scripts/background-main.js',
  'dist/temp/scripts/popup-main.js',
  'dist/temp/scripts/options-main.js',
  'dist/temp/scripts/history-main.js',
  'dist/temp/scripts/help-main.js',
  'dist/temp/scripts/content-main.js'
];

// Content script needs jQuery as external since it's injected separately
const contentScriptEntry = 'dist/temp/scripts/content-main.js';

async function copyJQueryFiles() {
  const jquerySource = 'node_modules/jquery/dist/jquery.min.js';
  const jqueryUiSource = 'node_modules/jquery-ui-dist/jquery-ui.min.js';
  const targetDir = 'dist/scripts';
  
  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(jquerySource, path.join(targetDir, 'jquery.min.js'));
  await fs.copyFile(jqueryUiSource, path.join(targetDir, 'jquery-ui.min.js'));
}

async function build() {
  try {
    console.log('Building extension...');
    
    // Build main entry points with esbuild
    for (const entry of bundledEntryPoints) {
      const outfile = entry.replace('/temp/', '/');
      const isContentScript = entry === contentScriptEntry;
      
      // Only externalize jQuery for content scripts (loaded via manifest)
      // Bundle jQuery for all other scripts (popup, options, history, help, background)
      const shouldExternalizeJQuery = isContentScript;
      
      await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        outfile: outfile,
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        external: shouldExternalizeJQuery ? ['jquery', 'jquery-ui'] : [],
        globalName: path.basename(entry, '.js').replace(/-/g, '_'),
      });
      
      console.log(`Built ${entry} -> ${outfile}`);
    }
    
    // Copy jQuery files
    await copyJQueryFiles();
    console.log('Copied jQuery libraries');
    
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

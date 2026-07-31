import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';

/**
 * Marks a stylesheet that should load as text.
 *
 * The null byte makes it a virtual module, and the trailing suffix matters just as
 * much. Vitest blanks out the contents of anything whose id matches roughly
 * `\.css($|\?)`, so neither `card.css` nor `card.css?text` survives - the suffix has
 * to leave a character other than `?` immediately after the extension.
 */
const CSS_TEXT_PREFIX = '\0css-text:';
const CSS_TEXT_SUFFIX = '.text';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*Tests.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: [
      // Map .js imports to .ts files
      { find: /^(\..*\/src\/.*)\.js$/, replacement: '$1.ts' },
      { find: /^(\..*\/tests\/.*)\.js$/, replacement: '$1.ts' },
      { find: /^(src\/.*)\.js$/, replacement: '$1.ts' },
      { find: /^(tests\/.*)\.js$/, replacement: '$1.ts' },
      { find: /^src\/(.*)$/, replacement: path.resolve(__dirname, './src/$1') },
      { find: /^tests\/(.*)$/, replacement: path.resolve(__dirname, './tests/$1') },
    ],
    extensions: ['.ts', '.js', '.json'],
  },
  plugins: [
    {
      // Mirrors the css-text plugin in build.js: .css imports resolve to their text,
      // because the Translation Card inlines its stylesheet into a shadow root. See
      // docs/adr/0001-shadow-dom-for-translation-card.md.
      //
      // CSS is rewritten to a virtual id rather than loaded under its own path, and
      // the plugin runs `pre`. Both are needed - without either, the built-in CSS
      // handling claims the module first and the import silently yields "".
      name: 'text-loader',
      enforce: 'pre',
      resolveId(source) {
        if (source.endsWith('.css')) {
          // Same basename-to-src/css mapping the esbuild plugin uses.
          const file = path.resolve(__dirname, 'src/css', path.basename(source));
          return CSS_TEXT_PREFIX + file + CSS_TEXT_SUFFIX;
        }
      },
      load(id) {
        if (id.startsWith(CSS_TEXT_PREFIX)) {
          const file = id.slice(CSS_TEXT_PREFIX.length, -CSS_TEXT_SUFFIX.length);
          const content = readFileSync(file, 'utf-8');
          return `export default ${JSON.stringify(content)};`;
        }
        if (id.endsWith('.html')) {
          const content = readFileSync(id, 'utf-8');
          return `export default ${JSON.stringify(content)};`;
        }
      },
    },
  ],
});

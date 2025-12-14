import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';

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
      name: 'html-loader',
      load(id) {
        if (id.endsWith('.html')) {
          const content = readFileSync(id, 'utf-8');
          return `export default ${JSON.stringify(content)};`;
        }
      },
    },
  ],
});

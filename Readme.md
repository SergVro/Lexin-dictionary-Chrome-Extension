# Lexin Dictionary Chrome Extension

Swedish to other languages dictionary extension for Chrome. Powered by Lexin and Folkets Lexikon.

## Features

- Translate Swedish words to multiple languages
- Support for Albanian, Amharic, Arabic, Azerbaijani, Bosnian, Croatian, English, Finnish, Greek, Kurdish, Pashto, Persian, Russian, Serbian, Somali, Spanish, Swedish, Tigrinya, Turkish, and Ukrainian
- Quick translation via Alt + Double Click or Alt + Click, with Ctrl and Shift
  offered as alternatives for desktops that keep Alt for themselves
- A rebindable keyboard shortcut that translates the selected word
- Translation history with export capabilities
- Customizable language preferences

## Development

### Prerequisites

- Node.js 16+ and npm
- Modern web browser (Chrome/Edge) for testing

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build
```

Releases are cut by pushing a `vX.Y.Z` git tag, which packages and publishes
to the Chrome Web Store via CI — see [RELEASE.md](RELEASE.md).

### Available Scripts

- `npm run dev` - Development loop: opens Chrome with the extension loaded and reloads it on every save (see below)
- `npm run clean` - Remove build artifacts
- `npm run build` - Build the extension (TypeScript compilation, bundling, and copying assets)
- `npm run build:ts` - Compile TypeScript files
- `npm run build:bundle` - Bundle JavaScript with esbuild
- `npm run build:copy` - Copy static assets (CSS, HTML, icons, manifest) to dist
- `npm run watch` - Rebuild dist/ on every change, without opening a browser
- `npm run typecheck` - Type check without emitting (the watch loop does not type check)
- `npm run lint` - Run ESLint on source files
- `npm run lint:fix` - Fix ESLint issues automatically

### Development loop

```bash
npm run dev
```

Opens a Chrome window with the extension loaded from `dist/`, plus the static test
page the E2E suite uses. Saving anything in `src/` rebuilds in about 50ms, reloads
the extension, and reloads the open pages - no visit to `chrome://extensions`.

The extension's ID is derived from the path to `dist/`, so it is the same on every
run and the surface URLs printed at startup can be bookmarked. Settings, history and
open tabs live in `.chrome-dev-profile/` and survive a restart.

Two things to know:

- **Types are not checked in this loop.** It bundles with esbuild alone, which strips
  types without reading them. Run `npm run typecheck` (or `npm run build`, which
  compiles with `tsc`) before committing.
- **`CHROME_CHANNEL=chrome npm run dev`** runs against installed Chrome instead of
  the Chromium Playwright ships. The default matches what the E2E suite tests
  against.

### Project Structure

```
.
├── src/
│   ├── scripts/          # TypeScript source files
│   │   ├── Dictionary/   # Dictionary implementations
│   │   ├── Messaging/    # Chrome messaging system
│   │   └── *.ts         # Main application files
│   ├── html/            # HTML pages
│   ├── css/             # Stylesheets
│   ├── icons/           # Extension icons
│   └── manifest.json    # Chrome extension manifest (V3)
├── dist/                # Built extension (generated)
├── build.js             # Build script using esbuild
├── tsconfig.json        # TypeScript configuration
├── eslint.config.js     # ESLint configuration (flat config)
└── package.json         # NPM dependencies and scripts
```

### Technology Stack

- **TypeScript 7** - Type-safe JavaScript, compiled with the native `tsc`
- **ES Modules** - Modern JavaScript module system
- **esbuild** - Fast JavaScript bundler
- **ESLint 10** - Code linting (flat config + typescript-eslint)
- **Native DOM APIs** - Modern browser APIs for DOM manipulation and positioning
- **Chrome Extension Manifest V3** - Latest extension platform

#### TypeScript 6 and 7 side by side

`package.json` installs two TypeScript packages on purpose:

```json
"typescript": "npm:@typescript/typescript6@^6.0.2",
"@typescript/native": "npm:typescript@^7.0.2"
```

`tsc` (and `npm run build:ts`) is the native TypeScript 7 compiler. The `typescript`
entry is aliased to the TypeScript 6 API package because tools that consume the
compiler programmatically — `typescript-eslint`, `ts-node` — do not support the
TypeScript 7 API yet ([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).
This is the side-by-side layout recommended in the TypeScript 7 release notes. Once
`typescript-eslint` ships TypeScript 7 support, drop the alias and depend on
`typescript` directly.

### Modernization (October 2024)

This extension has been modernized from the legacy build system:

**Replaced:**
- ❌ Grunt → ✅ npm scripts + esbuild
- ❌ Bower → ✅ npm packages
- ❌ RequireJS/AMD → ✅ ES modules
- ❌ TSLint → ✅ ESLint
- ❌ jQuery/jQuery UI → ✅ Native DOM APIs
- ❌ Manifest V2 → ✅ Manifest V3
- ❌ Background pages → ✅ Service workers

**Benefits:**
- Much faster builds (esbuild vs Grunt)
- Modern development workflow
- Manifest V3 compliance for future Chrome versions
- Simplified dependency management
- Better type checking with modern TypeScript

### Loading the Extension in Chrome

`npm run dev` does this for you. To load it into your own Chrome instead:

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder

### Testing

The extension includes unit tests (currently disabled during migration). To re-enable:
- Update the test configuration in `package.json`
- Install test dependencies
- Update tests for the new module system

## Usage

### Quick Translation
1. Alt + Double Click on any word on a webpage
2. Or select a word and Alt + Click
3. Or select a word and press the keyboard shortcut
4. Or select a word and click the extension icon

The modifier is configurable in Options — ChromeOS and some Linux desktops intercept
Alt+click before the page ever sees it. The keyboard shortcut is bound in Chrome, at
chrome://extensions/shortcuts.

### Translation History
- Access via the popup window or options page
- Export to flashcard applications like Quizlet
- Clear history per language

### Options
- Set default language
- Enable/disable specific languages
- Customize which languages appear in dropdowns
- Choose the modifier held to look a word up (Alt, Ctrl or Shift)
- Open Chrome's shortcuts page to bind the keyboard shortcut

## Releasing

See [RELEASE.md](RELEASE.md) for how to cut a release and the one-time Chrome
Web Store / Google Cloud setup it depends on.

## Contributing

Contributions are welcome! Please ensure:
1. Code follows ESLint rules: `npm run lint`
2. TypeScript compiles without errors: `npm run typecheck`
3. Extension builds successfully: `npm run build`
4. Tests pass: `npm test` and `npm run test:e2e`

## License

See LICENSE.txt for details.

## Links

- [Lexin Dictionary](http://lexin2.nada.kth.se/lexin/)
- [Chrome Web Store](https://chrome.google.com/webstore) (search for "Lexin Dictionary")
- [Report Issues](https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues)

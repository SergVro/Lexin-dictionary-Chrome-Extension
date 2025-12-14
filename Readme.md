# Lexin Dictionary Chrome Extension

Swedish to other languages dictionary extension for Chrome. Powered by Lexin and Folkets Lexikon.

## Features

- Translate Swedish words to multiple languages
- Support for Albanian, Amharic, Arabic, Azerbaijani, Bosnian, Croatian, English, Finnish, Greek, Kurdish, Pashto, Persian, Russian, Serbian, Somali, Spanish, Swedish, and Turkish
- Quick translation via Alt + Double Click or Alt + Click
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

# Create a distribution package
npm run package
```

### Available Scripts

- `npm run clean` - Remove build artifacts
- `npm run build` - Build the extension (TypeScript compilation, bundling, and copying assets)
- `npm run build:ts` - Compile TypeScript files
- `npm run build:bundle` - Bundle JavaScript with esbuild
- `npm run build:copy` - Copy static assets to dist
- `npm run watch` - Watch TypeScript files for changes
- `npm run lint` - Run ESLint on source files
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run package` - Build and create a ZIP file for distribution
- `npm run dev` - Build and start watch mode

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
├── .eslintrc.json       # ESLint configuration
└── package.json         # NPM dependencies and scripts
```

### Technology Stack

- **TypeScript 5.5+** - Type-safe JavaScript
- **ES Modules** - Modern JavaScript module system
- **esbuild** - Fast JavaScript bundler
- **ESLint** - Code linting
- **Native DOM APIs** - Modern browser APIs for DOM manipulation and positioning
- **Chrome Extension Manifest V3** - Latest extension platform

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
3. Or select a word and click the extension icon

### Translation History
- Access via the popup window or options page
- Export to flashcard applications like Quizlet
- Clear history per language

### Options
- Set default language
- Enable/disable specific languages
- Customize which languages appear in dropdowns

## Contributing

Contributions are welcome! Please ensure:
1. Code follows ESLint rules: `npm run lint`
2. TypeScript compiles without errors: `npm run build:ts`
3. Extension builds successfully: `npm run build`

## License

See LICENSE.txt for details.

## Links

- [Lexin Dictionary](http://lexin2.nada.kth.se/lexin/)
- [Chrome Web Store](https://chrome.google.com/webstore) (search for "Lexin Dictionary")
- [Report Issues](https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues)

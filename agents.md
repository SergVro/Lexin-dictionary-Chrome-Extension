# Lexin Dictionary Chrome Extension - Architecture Documentation

## Overview

The Lexin Dictionary Chrome Extension is a Swedish-to-multilingual dictionary tool that provides quick word translations using Lexin and Folkets Lexikon APIs. The extension supports 18+ languages and offers features like translation history, customizable language preferences, and quick translation via Alt+Click or Alt+Double-Click.

**Technology Stack:**
- TypeScript 5.5+ with ES Modules
- Chrome Extension Manifest V3
- esbuild for bundling
- Native DOM APIs for manipulation
- Chrome Storage API for persistence
- Service Workers for background processing

---

## Architecture Components

### 1. Content Scripts (`ContentScript.ts`)

**Purpose:** Runs on all web pages and handles user interactions for quick translations.

**Main Functions:**

#### `getSelection(): string`
- Retrieves the currently selected text on the webpage
- Trims whitespace and returns cleaned selection
- Used as the base for all translation operations

#### `showTranslation(selection, evt, zIndex, insideTranslationRef): number`
- Creates and positions a floating translation popup on the page
- Displays "Searching for..." message immediately
- Requests translation from background service
- Positions popup relative to mouse click using `PositionUtils.position()`
- Repositions after content loads to adjust for size changes
- Returns updated z-index for stacking multiple popups
- Uses fixed positioning with collision detection (flipfit)

#### `subscribeOnClicks(): void`
- **Single Click + Alt:** Shows translation for selected text
- **Double Click + Alt:** 
  - Extracts word at cursor position if no selection exists
  - Uses `caretRangeFromPoint()` to find text node and word boundaries
  - Shows translation popup for the word
  - Includes Mac compatibility (checks Alt/Option key via multiple methods)
- **Click outside popup:** Removes existing translation container and resets z-index
- Tracks Alt key state via keydown/keyup events for better Mac compatibility

#### `handleGetSelection(): void`
- Registers message handler for popup requests
- Returns selected text to popup only if non-empty
- Prevents empty callbacks from multiple frames

#### `private async initialize(): Promise<void>`
- Sets up all event handlers and message listeners
- Entry point called when content script loads
- **Async:** Waits for LanguageManager initialization before proceeding

---

### 2. Background Worker (`BackgroundWorker.ts`)

**Purpose:** Service worker that processes translation requests and manages history.

**Main Functions:**

#### `getTranslation(word, direction): Promise<ITranslation>`
- Delegates translation request to `TranslationManager`
- Returns native Promise with translation result
- Handles errors and returns formatted error messages
- Returns `{translation: string, error: string}` object
- Always resolves (never rejects) to ensure UI gets feedback

#### `initialize(): void`
- Registers message handlers:
  - `getTranslation`: Handles translation requests
  - `loadHistory`: Retrieves translation history for a language
  - `clearHistory`: Clears history for a language
- Sets up communication bridge between content scripts and translation logic

---

### 3. Popup Page (`PopupPage.ts`)

**Purpose:** Main UI popup that appears when clicking the extension icon.

**Main Functions:**

#### `translateSelectedWord(): void`
- Requests selected text from active tab's content script (async)
- Automatically translates if text is found
- Shows "No word selected" message if nothing selected
- Tracks analytics event for popup translations
- **Note:** Uses promises for async message handling

#### `getTranslation(direction?): void`
- Fetches translation for current word in selected language
- Shows "Searching for..." loading message
- Updates UI with translation or error message
- Adapts links in translation HTML using `LinkAdapter`
- Supports both directions: Swedish→Language and Language→Swedish

#### `setCurrentWord(word, skipHistory?, skipInput?): void`
- Sets the current word being translated
- Adds word to navigation history (unless `skipHistory=true`)
- Updates both display field and input field (unless `skipInput=true`)
- Trims whitespace from word

#### `async fillLanguages(): Promise<void>`
- Populates language dropdown with enabled languages
- Gets list from `LanguageManager.getEnabledLanguages()` (async)
- Creates option elements dynamically
- **Async:** Must await language loading from storage

#### `subscribeOnEvents(): void`
- **Language change:** Triggers new translation, saves preference
- **History link click:** Opens history page in new tab
- **Translation article click:** Translates selected word within translation
- **Word input (Swedish→Language):** Debounced search after 500ms (min 2 chars)
- **Reverse input (Language→Swedish):** Reverse translation with debouncing
- **Ctrl+Left/Right Arrow:** Navigate translation history
- **Quick tip display:** Shows/hides tip based on localStorage setting

---

### 4. History Manager (`HistoryManager.ts`)

**Purpose:** Manages translation history storage and compression.

**Main Functions:**

#### `async getHistory(langDirection): Promise<IHistoryItem[]>`
- Loads history for specified language direction from storage
- Compresses history (removes duplicates)
- Saves compressed version back to storage
- Returns array of `{word, translation, added}` objects
- **Async:** Uses async storage API (Chrome Storage or LocalStorage)

#### `async addToHistory(langDirection, translations): Promise<void>`
- Appends new translations to existing history
- Compresses if history exceeds threshold (maxHistory + buffer)
- Serializes and saves to async storage
- Default max: 1000 items with 200-item buffer
- **Async:** All storage operations are asynchronous

#### `async clearHistory(langDirection): Promise<void>`
- Removes all history for specified language direction
- Deletes from async storage using composite key
- **Async:** Storage deletion is asynchronous

#### `compress(history): void`
- Calls `_removeDuplicates()` to merge duplicate words
- Sorts by date (newest first)
- Trims to max length if exceeded
- Tracks compression event in analytics

#### `_removeDuplicates(history): void`
- Scans history backwards to find duplicate words
- If translations identical: removes duplicate
- If translations different: combines them with "; " separator
- Preserves most recent entry, merges older ones

#### `combineTranslations(translations1, translations2): string[]`
- Merges two translation arrays
- Removes duplicates from combined result
- Used when consolidating history entries

---

### 5. Translation Manager (`TranslationManager.ts`)

**Purpose:** Coordinates translation requests across different dictionaries.

**Main Functions:**

#### `getTranslation(word, direction, languageDirection?, skipHistory?): Promise<string>`
- Main translation orchestrator
- Validates word is non-empty
- Determines language direction (uses current if not specified)
- Gets appropriate dictionary from `DictionaryFactory`
- Requests translation from dictionary
- Parses translation and adds to history (unless `skipHistory=true`)
- Tracks translation success/error in analytics
- Returns HTML string with translation content

**Parameters:**
- `direction`: `TranslationDirection.to` (Swedish→Language) or `TranslationDirection.from` (Language→Swedish)
- `languageDirection`: e.g., "swe_eng", "swe_rus"
- `skipHistory`: If true, translation not saved to history

---

### 6. Dictionary Factory (`DictionaryFactory.ts`)

**Purpose:** Manages multiple dictionary implementations and language support.

**Main Functions:**

#### `getDictionary(langDirection): IDictionary`
- Finds first dictionary that supports the requested language direction
- Throws error if no compatible dictionary found
- Supports pluggable dictionary architecture

#### `getAllSupportedLanguages(): ILanguage[]`
- Aggregates languages from all dictionaries
- Removes duplicates
- Sorts alphabetically by language name
- Returns `{value: "swe_eng", text: "English"}[]`

**Supported Dictionaries:**
1. **LexinDictionary:** Primary dictionary supporting 19 languages
2. **FolketsDictionary:** Alternative/fallback dictionary

**Loader:**
- **FetchLoader:** Fetch-based loader with encoding detection, used across all contexts

---

### 7. Lexin Dictionary (`LexinDictionary.ts`)

**Purpose:** Implementation for Lexin dictionary API.

**Main Functions:**

#### `createQueryUrl(word, langDirection, direction): string`
- Constructs Lexin API URL
- Format: `http://lexin.nada.kth.se/lexin/service?searchinfo={direction},{langDirection},{word}`
- Encodes word for URL safety
- Direction: "to" or "from"

#### `isWordFound(word, translation): boolean`
- Checks if translation contains actual results
- Returns false if "Ingen träff" (No match) or "Ingen unik träff" (No unique match)
- Decodes HTML entities before checking

#### `supportedLanguages: ILanguage[]`
Returns 19 supported languages:
- Albanian, Amharic, Arabic, Azerbaijani
- Bosnian, Croatian, Finnish, Greek
- Northern Kurdish, South Kurdish, Pashto, Persian
- Russian, Serbian (Latin & Cyrillic)
- Somali, Spanish, Swedish, Turkish

#### `parsingRegExp: RegExp`
- Regex pattern to extract word-translation pairs from HTML response
- Captures Swedish word and translated word from Lexin's HTML format

---

### 8. Language Manager (`LanguageManager.ts`)

**Purpose:** Manages language preferences and enabled languages.

**Main Functions:**

#### `getLanguages(): ILanguage[]`
- Returns all available languages from dictionary factory
- Full list of supported languages regardless of enabled state
- **Synchronous:** Returns cached language list

#### `async getEnabledLanguages(): Promise<ILanguage[]>`
- Filters languages to only those enabled by user
- Always includes current language even if not in enabled list
- Returns subset of `getLanguages()`
- **Async:** Loads enabled languages from async storage

#### `async setEnabledLanguages(languages): Promise<void>`
- Saves enabled language list to settings storage
- Stores as comma-separated values string
- **Async:** Storage operations are asynchronous

#### `async getCurrentLanguage(): Promise<string>`
- Gets default language for translations
- Defaults to "swe_swe" (Swedish-Swedish) if not set
- **Async:** Loads from async storage
- **Note:** Synchronous getter `currentLanguage` exists for backward compatibility but returns default value

#### `async setCurrentLanguage(value): Promise<void>`
- Sets default language for translations
- Validates language value exists before setting
- **Async:** Saves to async storage
- **Note:** Synchronous setter `currentLanguage` exists for backward compatibility

#### `async setEnabled(language): Promise<void>`
- Enables a specific language
- Updates enabled languages list in storage
- No-op if already enabled
- **Async:** Storage operations are asynchronous

#### `async setDisabled(language): Promise<void>`
- Disables a specific language
- Updates enabled languages list in storage
- No-op if already disabled
- **Async:** Storage operations are asynchronous

#### `async isEnabled(languageValue): Promise<boolean>`
- Checks if specific language is enabled
- Used for UI checkbox states
- **Async:** Loads enabled languages from async storage

#### `async waitForInitialization(): Promise<void>`
- Waits for LanguageManager to complete initialization
- Should be called before using LanguageManager in constructors
- Ensures default languages are set if not configured
- **Async:** Returns promise that resolves when initialization completes

---

### 9. Options Page (`OptionsPage.ts`)

**Purpose:** Settings page for configuring languages and preferences.

**Main Functions:**

#### `async save_options(): Promise<void>`
- Saves default language (from radio buttons)
- Saves enabled languages (from checkboxes)
- Shows "Options saved" status message (fades out after 750ms)
- Persists to async storage via `LanguageManager`
- **Async:** All storage operations are asynchronous

#### `async restore_options(): Promise<void>`
- Loads saved default language on page load
- Checks appropriate radio button
- **Async:** Loads from async storage

#### `async fillLanguages(): Promise<void>`
- Creates language selection UI dynamically
- For each language:
  - Radio button for default selection
  - Checkbox for enabled/disabled state
  - Disables checkbox for currently selected default language
- Wires up event handlers:
  - Radio change: Updates default language, auto-saves, enables previous default's checkbox
  - Checkbox change: Updates enabled languages, auto-saves
  - "Check All" checkbox: Enables all languages at once
- **Async:** Must await language loading and enabled state checks from async storage

---

### 10. History Page (`HistoryPage.ts`)

**Purpose:** Displays translation history with filtering and export options.

**Main Functions:**

#### `updateHistory(): void`
- Reloads and renders history for current language
- Called when language or display options change
- **Note:** Uses async `loadHistory()` internally via promises

#### `renderHistory(langDirection, showDate): void`
- Creates HTML table with translation history
- Columns: Date (optional), Word, Translation
- Groups translations by date (collapses duplicate dates)
- Shows "No translations in history" if empty
- Enables/disables Clear History and Show Date controls based on content

#### `renderLanguageSelector(): void`
- Populates language dropdown
- Disables dropdown if no languages available
- **Note:** Languages are loaded asynchronously in `initialize()`

#### `subscribeOnEvents(): void`
- **Language change:** Updates displayed history
- **Show Date checkbox:** Toggles date column visibility
- **Clear History button:** Confirms and clears history for selected language

**Properties:**
- `currentLanguage`: Currently selected language for display
- `showDate`: Boolean flag for date column visibility

**Initialization:**
- `private async initialize(): Promise<void>` - Async initialization that loads languages and settings

---

### 11. Message Service (`MessageService.ts`)

**Purpose:** Abstraction layer for Chrome extension messaging.

**Main Functions:**

#### `getTranslation(word, direction?): Promise<ITranslation>`
- Sends message to background worker to get translation
- Returns promise with `{translation, error}` object
- Uses `MessageBus` singleton for communication

#### `getSelectedText(): Promise<string>`
- Sends message to active tab's content script
- Returns selected text from page
- Used by popup to get text without tab permissions

#### `loadHistory(language): Promise<IHistoryItem[]>`
- Requests history from background worker
- Returns array of history items

#### `clearHistory(language): Promise<void>`
- Requests background worker to clear history
- Returns promise that resolves when complete

#### `createNewTab(url): void`
- Opens new browser tab with specified URL
- Used for opening history page

---

### 12. Utility Modules

#### **DomUtils.ts**
DOM manipulation utilities using native browser APIs:
- `$(selector)`: Query single element (wrapper for `querySelector`)
- `$$(selector)`: Query multiple elements (wrapper for `querySelectorAll`)
- `createElement(tag, attrs?, content?)`: Create element
- `addClass/removeClass/setCss`: Style manipulation
- `setHtml/setAttr/setValue`: Content manipulation
- `append/empty/remove`: DOM tree manipulation
- `trim(str)`: String trimming

#### **PositionUtils.ts**
Position calculation for translation popup:
- `position(element, options)`: Smart positioning system
  - `of`: Position relative to element or event
  - `my`: Alignment point on element being positioned
  - `at`: Alignment point on target
  - `collision`: Behavior when overflowing viewport ("flipfit")
- Handles viewport bounds checking
- Implements flip behavior (top ↔ bottom, left ↔ right)

#### **AnimationUtils.ts**
Animation utilities:
- `fadeOut(element, duration, callback?)`: Fades element opacity to 0
- Uses requestAnimationFrame for smooth animations
- Calculates elapsed time and easing

---

## Message Flow Architecture

### Translation Flow (Alt+Click)

1. **Content Script** detects Alt+Click
2. Content Script calls `MessageService.getTranslation(word)`
3. **Message Bus** routes to Background Worker
4. **Background Worker** calls `TranslationManager.getTranslation()`
5. **Translation Manager** gets appropriate dictionary from factory
6. **Dictionary** fetches from external API (Lexin/Folkets)
7. Dictionary parses HTML response
8. **History Manager** saves to localStorage
9. Result flows back through message bus
10. **Content Script** displays popup with translation

### Popup Translation Flow

1. User clicks extension icon → **Popup Page** opens
2. Popup calls `MessageService.getSelectedText()`
3. **Message Bus** queries all frames in active tab
4. **Content Script** responds with selection
5. Popup calls `MessageService.getTranslation(word)`
6. Same flow as above (steps 3-9)
7. **Popup Page** displays result in UI

### History Management Flow

1. **History Page** calls `MessageService.loadHistory(language)`
2. **Message Bus** routes to Background Worker
3. Background Worker calls `HistoryManager.getHistory()`
4. **History Manager** loads from localStorage, compresses
5. Result flows back to History Page
6. **History Page** renders table

---

## Data Storage

### Chrome Storage
- **Settings:** `defaultLanguage`, `enabledLanguages`
- Managed by `ChromeStorageAdapter` wrapping `chrome.storage.local`
- **All operations are async:** `getItem()`, `setItem()`, `removeItem()`, `clear()` return Promises
- Used in service workers where `localStorage` is not available

### LocalStorage / Async Storage
- **Translation History:** `history{langDirection}` (e.g., `historyswe_eng`)
- Format: JSON array of `{word, translation, added}` objects
- Separate history per language direction
- Max 1000 items per language (with 200-item buffer)
- **All operations are async:** Uses `IAsyncStorage` interface with Promise-based API
- In service workers: Uses `ChromeStorageAdapter` (chrome.storage.local)
- In content scripts/pages: May use LocalStorage adapter (if available)

---

## Key Interfaces

### `ITranslation`
```typescript
{
  translation: string;  // HTML content
  error: string;        // Error message if failed
}
```

### `IHistoryItem`
```typescript
{
  word: string;         // Source word
  translation: string;  // Translated text(s)
  added: number;        // Timestamp
}
```

### `ILanguage`
```typescript
{
  value: string;        // e.g., "swe_eng"
  text: string;         // e.g., "English"
}
```

### `TranslationDirection` (enum)
- `to`: Swedish → Target Language
- `from`: Target Language → Swedish

---

## Extension Pages

### 1. Popup (`popup.html`)
- Quick translation interface
- Language selector
- Word input fields (bidirectional)
- Translation display area
- Link to history page
- Quick tip banner

### 2. Options (`options.html`)
- Default language selection (radio buttons)
- Enable/disable languages (checkboxes)
- "Check All" convenience button
- Auto-saves on change

### 3. History (`history.html`)
- Language filter dropdown
- Show/Hide date column toggle
- Translation history table
- Clear history button
- Export capabilities (for flashcards)

### 4. Help (`help.html`)
- Usage instructions
- Keyboard shortcuts
- Feature descriptions

---

## Build System

### Build Process (`build.js` + npm scripts)

1. **TypeScript Compilation** (`npm run build:ts`)
   - Compiles `.ts` → `.js` with ES modules
   - Outputs to `dist/scripts/`

2. **Bundling** (`npm run build:bundle`)
   - Uses esbuild to bundle entry points:
     - `background-main.ts` → Service worker
     - `content-main.ts` → Content script
     - `popup-main.ts`, `options-main.ts`, `history-main.ts`, `help-main.ts` → UI pages
   - Bundles dependencies and polyfills

3. **Asset Copying** (`npm run build:copy`)
   - Copies CSS, HTML, icons, manifest to `dist/`

4. **Package** (`npm run package`)
   - Creates `lexin-extension.zip` for distribution

---

## Analytics & Tracking

**Tracker.ts** sends events to Google Analytics:
- Translation events (language, source: popup/content)
- Language changes
- History operations (view, clear, compress)
- Feature usage (enabled languages, show date)

---

## Error Handling

### Translation Errors
- Network failures: Shows "Error connecting to dictionary service"
- No results: Shows "Ingen träff" message from dictionary
- Invalid language: Throws error in LanguageManager

### History Errors
- Storage quota: Automatic compression when buffer exceeded
- Parse errors: Returns empty array, logs to console

### UI Errors
- No selection: Shows "No word selected" in popup
- Empty word: No-op, doesn't trigger translation

---

## Browser Compatibility

### Chrome/Edge (Manifest V3)
- Service workers instead of background pages
- Native Promises and fetch API
- `chrome.storage` API for settings
- `chrome.runtime` for messaging

### Mac Compatibility
- Alt/Option key detection via multiple methods:
  - `evt.altKey`
  - `evt.getModifierState("Alt")`
  - Manual keydown/keyup tracking
- Word extraction at cursor position for double-click

---

## Development Commands

```bash
npm install              # Install dependencies
npm run build           # Full build (compile + bundle + copy)
npm run watch           # Watch mode for development
npm run lint            # Run ESLint
npm run test            # Run unit tests (Vitest)
npm run package         # Create distribution ZIP
```

---

## Future Enhancements

1. Offline mode with cached translations
2. Pronunciation audio
3. Example sentences
4. Flashcard integration (Anki, Quizlet)
5. Dark mode theme
6. Keyboard shortcuts customization
7. Context menu integration
8. Firefox support (Manifest V3 compat)

---

## File Structure Summary

```
src/
├── scripts/
│   ├── background-main.ts          # Service worker entry
│   ├── BackgroundWorker.ts         # Translation orchestrator
│   ├── content-main.ts             # Content script entry
│   ├── ContentScript.ts            # Page interaction handler
│   ├── popup-main.ts               # Popup entry
│   ├── PopupPage.ts                # Popup UI logic
│   ├── options-main.ts             # Options entry
│   ├── OptionsPage.ts              # Options UI logic
│   ├── history-main.ts             # History entry
│   ├── HistoryPage.ts              # History UI logic
│   ├── HistoryManager.ts           # History storage/compression
│   ├── LanguageManager.ts          # Language preferences
│   ├── Dictionary/
│   │   ├── DictionaryFactory.ts    # Dictionary selector
│   │   ├── LexinDictionary.ts      # Lexin API implementation
│   │   ├── FolketsDictionary.ts    # Folkets API implementation
│   │   ├── TranslationManager.ts   # Translation coordinator
│   │   └── ...
│   ├── Messaging/
│   │   ├── MessageService.ts       # Message abstraction
│   │   ├── MessageBus.ts           # Chrome messaging wrapper
│   │   └── ...
│   └── util/
│       ├── DomUtils.ts             # DOM helpers
│       ├── PositionUtils.ts        # Positioning logic
│       └── AnimationUtils.ts       # Animation helpers
├── html/                           # UI pages
├── css/                            # Stylesheets
├── icons/                          # Extension icons
└── manifest.json                   # Chrome extension config
```

---

## Testing

**Test Framework:** Vitest

**Test Files:**
- `BackgroundWorkerTests.ts`: Background worker logic
- `DictionaryFactoryTests.ts`: Dictionary selection
- `LexinDictionaryTests.ts`: Lexin API parsing
- `FolketsDictionaryTests.ts`: Folkets API parsing
- `HistoryManagerTests.ts`: History management
- `LanguageManagerTests.ts`: Language preferences
- `TranslationManagerTests.ts`: Translation flow

**Test Data:**
- HTML fixtures for dictionary response parsing
- Mock implementations in `util/fakes.ts`

---

This documentation provides a comprehensive overview of the Lexin Dictionary Chrome Extension's architecture, main functions, and data flow. Use it as a reference for understanding, maintaining, and extending the codebase.

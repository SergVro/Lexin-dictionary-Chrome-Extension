# Lexin Dictionary Extension

A Chrome extension that translates Swedish words into twenty other languages, using
the Lexin and Folkets Lexikon dictionary services. Translations are shown either
inline on the page being read, or in the extension's own pages.

## Language

### Surfaces

**Translation Card**:
The floating card shown over a web page when the reader performs the Lookup Trigger
on a word. Rendered by the content script into a shadow root so the host page cannot
style it.
_Avoid_: popup, tooltip, overlay, bubble

**Lookup Trigger**:
The modifier a reader holds while clicking or double-clicking a word to open a
Translation Card. Alt by default, and theirs to change - ChromeOS and some Linux
desktops consume Alt+click before the page is sent anything. Stored as
`triggerModifier`. Distinct from the *keyboard shortcut*, which Chrome owns and binds
at chrome://extensions/shortcuts.
_Avoid_: hotkey, hot key, shortcut (for the modifier), accelerator

**Action Popup**:
The panel that opens from the extension's toolbar icon, where a word can be typed
rather than selected.
_Avoid_: popup, extension window, browser action

**History Page**:
The extension page listing previously translated words, per Language Direction.
_Avoid_: history popup, log

**Options Page**:
The extension page where the default language and the enabled language set are chosen.
_Avoid_: settings, preferences

### Translation

**Language Direction**:
An identifier pairing a source and target language, written `swe_xxx` — the unit that
a translation, a history list, and an enabled/disabled toggle are all scoped to.
_Avoid_: language, locale, language pair

**Direction**:
Which way a lookup runs within a Language Direction — from Swedish, or to Swedish.
_Avoid_: reverse, inverse

**Dictionary**:
A translation source with its own query URL format and response markup. There are two:
Lexin and Folkets Lexikon.
_Avoid_: provider, backend, service

**Translation Markup**:
The HTML a Dictionary returns for a word. Third-party, not authored here, and subject
to change without notice — which is why the Translation Card styles it defensively.
_Avoid_: translation HTML, response body

**Enabled Language**:
A Language Direction the reader has chosen to see in the dropdowns. Distinct from a
*supported* language, which is one the Dictionary offers at all.
_Avoid_: active language, selected language

### Appearance

**Appearance**:
The reader's stored choice of `light`, `dark` or `system` — a setting, not a rendered
state. Held by `ThemeManager`.
_Avoid_: theme, dark mode, colour scheme

**Theme**:
What a surface actually renders as, once an Appearance of `system` has been resolved
against the OS. Only ever `light` or `dark`, and written to the DOM as
`data-lx-theme`, which every design token keys off.
_Avoid_: mode, skin

### Options

**Visible**:
Whether a Language Direction is offered in the popup's picker and the History page's
tabs. The stored form is the *Enabled Language* list above; "visible" is what the
Options page calls it, because that is what the reader sees change.
_Avoid_: shown, active

**Default**:
The one Language Direction a lookup uses when the reader has not chosen otherwise.
Exactly one exists, it is always Visible, and it is what `defaultLanguage` holds.
_Avoid_: primary language, current language

**Record history**:
Whether lookups are added to the history store. Off stops new entries only — what is
already stored stays until cleared from the History page.
_Avoid_: tracking, logging

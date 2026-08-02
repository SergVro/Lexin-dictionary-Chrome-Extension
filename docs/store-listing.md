# Chrome Web Store listing

The copy published on the extension's store page, kept here so it is versioned
alongside the release it describes.

Update it in the same pull request as the change it announces — the store's own
editor has no history, and the listing has drifted a full major version behind the
manifest before.

The store renders both fields as **plain text**. Line breaks survive; Markdown does
not. Copy the blocks below verbatim into the Chrome Web Store developer dashboard,
under *Store listing*.

The screenshots and promo tiles that go on the same page live in `store-assets/`, and
are generated from the built extension by `npm run store-assets`. Their captions
repeat claims made below - the language count, the export formats - so the two are
edited together.

## Short description

Maximum 132 characters. This one is 128.

```text
Alt+double-click any Swedish word to see it in your language. 21 dictionaries from Lexin and Folkets Lexikon, right on the page.
```

## Detailed description

Maximum 16,000 characters.

```text
Reading Swedish is a lot easier when the dictionary comes to you. Alt+double-click
any word on any page and its translation appears right there, over the text you're
reading — no new tab, no copy-paste, no losing your place.

Built for anyone learning svenska: SFI students, newcomers to Sweden, and anyone
working through Swedish news, job ads, Blocket listings or official letters.


HOW TO LOOK A WORD UP

• Alt + double-click a word on the page
• Or select the text, then Alt + click it
• Or click the toolbar icon and type the word — you can also swap the direction and
  translate from your language into Swedish

Translations include Lexin's pronunciation audio where the dictionary provides it,
and the card works inside iframes, so Gmail and similar apps are covered too.


LANGUAGES

Swedish into: Albanian, Amharic, Arabic, Azerbaijani, Bosnian, Croatian, English,
Finnish, Greek, Northern Kurdish, Pashto, Persian, Russian, Serbian (Latin),
Serbian (Cyrillic), Somali, South Kurdish, Spanish, Turkish, Ukrainian.

Plus Lexin's Swedish-to-Swedish dictionary, which explains a word in simple Swedish —
useful once you'd rather stay in the language than step out of it.

Languages you don't use can be switched off in Options so the picker stays short.


HISTORY AND FLASHCARDS

Every word you look up is saved, kept separately per language, and searchable.
From the History page you can export the words you tick:

• TSV — pastes straight into Quizlet's import box, default separators already match
• Anki .txt
• CSV
• Copy to clipboard

Or turn recording off entirely in Options if you'd rather nothing were saved.


SETTINGS

Choose which languages appear in the picker, which one is the default, and whether
the extension follows light, dark, or your system appearance.


PRIVACY

• Your history and settings stay on your own computer. Nothing is uploaded.
• No account, no sign-up, no analytics, no ads.
• The only thing that leaves your browser is the word you look up, sent over HTTPS
  to the dictionary.
• Chrome warns that this extension can "read and change your data on websites you
  visit". That is what lets it see the word you Alt+click on the page in front of
  you. It reads nothing else, and keeps no record of the pages you visit.


THE DICTIONARIES

Translations come from Lexin (https://lexin.nada.kth.se/lexin/) for every language
except English, and from Folkets Lexikon
(https://folkets-lexikon.csc.kth.se/folkets/) for English. Both are free Swedish
dictionary services from KTH. This extension is not affiliated with either.

Open source, and issues are welcome:
https://github.com/SergVro/Lexin-dictionary-Chrome-Extension


NEW IN VERSION 3.0

• Rebuilt interface across the in-page card, popup, History and Options, with light,
  dark and system appearance
• Export your history as Quizlet-ready TSV, Anki .txt, CSV, or to the clipboard
• History recording can now be turned off, and turned back on from the History page
• One search box in the popup with a button to swap the translation direction, plus
  back and forward through the words you looked up this session
• Search and bulk enable/disable on the Options page; search and per-language tabs
  on the History page
• The in-page card now renders in a shadow root, so no website's styling can break it
• All dictionary lookups now go over HTTPS, and the extension no longer requests
  permission to access websites directly
• Ukrainian added

Earlier releases: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/releases
```

## Notes for whoever edits this next

- **Keep the changelog to the current major version.** The listing previously carried
  every release back to 1.1. The store shows roughly two lines before "Read more", so
  a long version log buries the value proposition and fills the indexed text with
  version numbers. Older releases live on GitHub Releases; link there instead.
- **Swedish is not in the "Swedish into:" list on purpose.** `swe_swe` is Lexin's
  monolingual dictionary, and listing it beside the target languages reads as a bug.
  It gets its own sentence.
- **The permission warning is addressed head-on.** The manifest requests only
  `storage`, but the content script's `http://*/*` and `https://*/*` matches still
  make Chrome say "read and change all your data on websites you visit" at install.
  Leaving that unexplained costs installs.
- **Check the language list against `LexinDictionary.getSupportedLanguages()` and
  `FolketsDictionary.getSupportedLanguages()`** whenever a dictionary is added.
  Currently 20 via Lexin plus English via Folkets.
- **The dictionary hostnames are load-bearing.** They are `lexin.nada.kth.se` and
  `folkets-lexikon.csc.kth.se`, both over HTTPS. The listing carried a dead
  `lexin2.nada.kth.se` for years.

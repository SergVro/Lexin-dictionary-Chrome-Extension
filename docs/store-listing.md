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
repeat claims made below - the language count, the export formats, the keys a lookup
can be bound to - so the two are edited together.

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
• Or set a keyboard shortcut and press it with a word selected — no mouse at all
• Or click the toolbar icon and type the word — you can also swap the direction and
  translate from your language into Swedish

A double-click looks up the word you are pointing at rather than whatever happened to
be selected, so it still finds the word on pages that fight with text selection, and
inside the components modern sites are built out of.

Prefer a different key? Alt, Ctrl and Shift are all offered in Options. That matters
on ChromeOS and some Linux desktops, which keep Alt for themselves and never pass it
on to the page. The keyboard shortcut is the other way round the problem — no desktop
can take it, and Chrome lets you bind it to any combination you like.

Translations include Lexin's pronunciation audio where the dictionary provides it, and
it now plays on every site, including the ones whose security rules used to leave the
button silent. The card works inside iframes, so Gmail and similar apps are covered
too.


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

Choose which languages appear in the picker, which one is the default, whether the
extension follows light, dark, or your system appearance, which key you hold to look
a word up, and whether lookups are recorded at all.


PRIVACY

• Your history and settings stay on your own computer. Nothing is uploaded.
• No account, no sign-up, no analytics, no ads.
• The only thing that leaves your browser is the word you look up, sent over HTTPS
  to the dictionary.
• Chrome warns that this extension can "read and change your data on websites you
  visit". That is what lets it see the word you look up on the page in front of
  you. It reads nothing else, and keeps no record of the pages you visit.


THE DICTIONARIES

Translations come from Lexin (https://lexin.nada.kth.se/lexin/) for every language
except English, and from Folkets Lexikon
(https://folkets-lexikon.csc.kth.se/folkets/) for English. Both are free Swedish
dictionary services from KTH. This extension is not affiliated with either.

Open source, and issues are welcome:
https://github.com/SergVro/Lexin-dictionary-Chrome-Extension


NEW IN VERSIONS 3.1 AND 3.2

• Choose the key you hold to look a word up — Alt, Ctrl or Shift. Alt + click is the
  right-click on ChromeOS and moves windows on some Linux desktops, and neither ever
  reaches the page, so readers there could not look a word up at all.
• A keyboard shortcut that translates the selected word with no mouse at all, bound
  to whatever combination you choose in Chrome
• A double-click now looks up the word under the pointer, which finds words on pages
  that suppress text selection and inside the components modern sites are built from
• Pronunciation plays on every site. Some pages' security rules used to block the
  clip and leave the button silent.
• Words no longer go missing from history when several lookups finish at once

EARLIER IN VERSION 3

• Rebuilt interface across the in-page card, popup, History and Options, with light,
  dark and system appearance
• Export your history as Quizlet-ready TSV, Anki .txt, CSV, or to the clipboard
• History recording can be turned off, and turned back on from the History page
• One search box in the popup with a button to swap the translation direction, plus
  back and forward through the words you looked up this session
• Search and bulk enable/disable on the Options page; search and per-language tabs
  on the History page
• The in-page card renders in a shadow root, so no website's styling can break it
• All dictionary lookups go over HTTPS, and the extension no longer requests
  permission to access websites directly
• Ukrainian added

Earlier releases: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/releases
```

## Permission justification: offscreen

Maximum 1,000 characters. This one is 979. It goes in the *Privacy practices* tab of
the developer dashboard, not *Store listing* - one field per permission the manifest
requests, and the review stalls on a permission whose field is empty or vague.

Written to answer the reviewer's real question, which is not "what does offscreen do"
but "why can this extension not do without it". The reasoning is in
`docs/adr/0004-offscreen-audio-playback.md`; keep the two in step if the playback path
changes.

```text
Lexin's dictionary entries include a LYSSNA ("listen") link that plays the pronunciation of a word as an MP3 hosted by the dictionary service. The extension shows those entries in a card rendered inside the page the user is reading, and an audio element created there belongs to that page's document - so the clip loads under the page's Content Security Policy. Sites that set a strict policy block it and the button stays silent; on svt.se, for example, it fails with a CSP error.

The offscreen permission lets the extension play the clip in a document it owns, where its own policy applies, so pronunciation works on every site. When the user clicks the link, the service worker opens an offscreen document with reason AUDIO_PLAYBACK, passes it the MP3 URL, and Chrome closes the document automatically after 30 seconds of silence.

It is used for nothing else: no recording, no clipboard access, no data collection, and nothing runs there unless the user asks to hear a word.
```

## Notes for whoever edits this next

- **Keep the changelog to the current major version.** The listing previously carried
  every release back to 1.1. The store shows roughly two lines before "Read more", so
  a long version log buries the value proposition and fills the indexed text with
  version numbers. Older releases live on GitHub Releases; link there instead.
- **Two blocks, and only two.** The first is what is new since the listing was last
  published; everything still worth saying from the rest of the major version folds
  into "EARLIER IN VERSION x". On the next release, retitle the first block and move
  its bullets into the second, dropping any that have stopped being news. The pair
  should not run past a dozen bullets between them.
- **Title the first block for the versions it covers, not the manifest.** It reads
  "3.1 AND 3.2" because 3.1 shipped without the listing being touched, and pretending
  the offscreen audio fix arrived in 3.2 would be the same drift in miniature. Keep
  the store page and the manifest in step and it will usually be one version.
- **Say what the reader could not do before, not what was built.** "Alt + click is the
  right-click on ChromeOS" is why the trigger setting exists; "configurable trigger
  modifier" is what the commit says and tells a reader nothing.
- **The short description still leads with Alt** even though the key is now the
  reader's to choose. Alt is the default, it is what an installer will try first, and
  "Alt+double-click" is a concrete instruction where "hold a modifier" is not. The
  choice is made two paragraphs into the detailed description, which is where someone
  whose desktop eats Alt will be looking.
- **Keep the modifier sentence in step with `availableModifiers()`.** The listing
  offers Alt, Ctrl and Shift; a Mac is shown only Option and Shift, because macOS
  defines Ctrl+click as the secondary click and the gesture can never fire there. The
  reasoning is in `docs/adr/0005-configurable-lookup-trigger.md`.
- **Swedish is not in the "Swedish into:" list on purpose.** `swe_swe` is Lexin's
  monolingual dictionary, and listing it beside the target languages reads as a bug.
  It gets its own sentence.
- **The permission warning is addressed head-on.** The manifest requests only
  `storage` and `offscreen` - neither of which Chrome warns about - but the content
  script's `http://*/*` and `https://*/*` matches still make Chrome say "read and
  change all your data on websites you visit" at install. Leaving that unexplained
  costs installs. The dashboard asks separately for a justification per permission;
  the one for `offscreen` is above, and `storage` gets the plain answer - it holds the
  chosen language, the appearance setting and the lookup history, all local.
- **Check the language list against `LexinDictionary.getSupportedLanguages()` and
  `FolketsDictionary.getSupportedLanguages()`** whenever a dictionary is added.
  Currently 20 via Lexin plus English via Folkets.
- **The dictionary hostnames are load-bearing.** They are `lexin.nada.kth.se` and
  `folkets-lexikon.csc.kth.se`, both over HTTPS. The listing carried a dead
  `lexin2.nada.kth.se` for years.

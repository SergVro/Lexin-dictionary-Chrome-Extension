# Let the reader choose the lookup trigger

Alt + click was the only way to open a Translation Card for the extension's whole
life. Two issues said it did not work, on two platforms, and neither was a bug in the
extension:

- **[#21] ChromeOS.** Alt + click *is* the secondary click on a Chromebook — Google
  documents it as the way to right-click. Ash, the window server, consumes it before
  the renderer is sent anything, so the page receives a `contextmenu` and never a
  left `click` carrying `altKey`. Google is also midway through moving this to
  `Search + click` behind a flag, so the behaviour varies by ChromeOS version.
- **[#15] Linux.** GNOME's Mutter grabs Alt + click for window-move
  (`org.gnome.desktop.wm.preferences.mouse-button-modifier`).

No content script can win an event it is never sent. The only fix available to the
extension is to stop hardcoding the trigger, which is [#17].

Two routes now exist, and they answer different halves of the problem:

1. **A configurable modifier** — Alt (default), Ctrl or Shift, in Options. Keeps the
   fast double-click-a-word flow and lets a reader route around whatever their
   desktop takes.
2. **A `chrome.commands` keyboard shortcut** — `translate-selection`, suggested at
   `Ctrl+Shift+L`. A browser-level shortcut is the one trigger no desktop can
   intercept, and Chrome supplies the rebinding UI at `chrome://extensions/shortcuts`
   for free, so the extension ships no key-capture widget of its own.

## What hand-testing changed

Two defects turned up on macOS that the obvious design would have shipped:

- **Ctrl + double-click opened the context menu.** macOS defines Ctrl + click as the
  secondary click, so Chrome raises `contextmenu` off the mousedown and suppresses the
  `click` entirely. No listener ordering recovers it. **Ctrl is therefore not offered
  on a Mac** (`availableModifiers`), and `Settings.getTriggerModifier` falls back to
  Alt if it somehow finds `ctrl` stored there. A Mac needs no escape hatch anyway:
  Option + click, the default, works fine.
- **Shift + click expanded the selection.** Shift + click's own meaning is "extend the
  selection from the existing anchor", so after one lookup the anchor sat on the first
  word and the next Shift + click selected everything in between — and looked *that*
  up. This has two halves and needed two fixes:
  - the double-click path naming its word by **position** (`wordAtPoint`) rather than
    by reading the selection — which fixes *which word gets looked up*;
  - `preventDefault()` on `mousedown`, which stops the selection growing at the source
    (selection changes are a mousedown default) — which fixes *the page visibly
    selecting half a paragraph*.

  `tests/e2e/trigger.spec.ts` covers them as two separate tests, because each passes
  while the other's fix is removed. That was found by removing each and watching.

  **The mousedown `preventDefault` is applied for Shift only.** Alt and Ctrl replace
  the selection rather than extending it, so they have nothing to fix — and
  suppressing their default would throw away the browser's own double-click word
  selection, which the dblclick handler still wants as a fallback. That fallback is
  not theoretical: `caretRangeFromPoint` answers for points inside the viewport only,
  so `wordAtPoint` returns nothing for a word below the fold. A reader cannot click a
  word they cannot see, but a test harness can, and doing it unconditionally broke six
  style-isolation tests before this was narrowed. Leaving the default alone for the
  shipped trigger also means Alt behaves exactly as it always has.

## What code review changed

Three defects Codex found on the PR, all of them real:

- **Two documents answered one keystroke.** Every document on the focused chain
  reports `hasFocus`, and each keeps whatever it had selected last — so a reader who
  selected a word in the page and then another inside an iframe left both claiming a
  live selection, and both opened a card and filed a history entry. What names a
  single frame is being the *deepest* focused one: a document whose own
  `activeElement` is a frame has handed focus on.
- **A word split across inline elements came back in pieces.** `h<em>u</em>nd`
  renders as one word and a reader double-clicks it as one, but it is three text
  nodes, and `wordAtPoint` scans only the node under the pointer — returning `u`.
  Fixed by preferring the browser's own selection wherever it was allowed to make
  one: it spans inline elements, and its word segmentation knows more about language
  than a regular expression ever will. Position remains the answer where the
  selection was suppressed, and the fallback where position cannot answer.
- **A double-click looked its word up twice.** A double-click arrives as click,
  click, dblclick, and the second click reached the lookup too. This was *pre-existing*
  — every Alt+double-click had been making two dictionary requests and filing two
  identical history entries — and was found only because the review prompted a look.
  Fixed by ignoring clicks carrying `detail > 1`.
  - Under Shift there is a second half: suppressing the mousedown default keeps an
    older selection alive, so the *first* click of a double-click would look *that*
    up. Fixed by deferring the click lookup and cancelling it when a double-click
    follows. Only the Shift path waits, so the shipped trigger costs nothing.

Each has a regression test, and each test was verified by removing its fix and
watching it fail. That mattered: two of them passed at first against the broken code,
because a lookup's card is dismissed by the next one and leaves no trace on the page.
Both now count history entries instead, which is where the harm actually lands.

## Consequences worth knowing

- **The two mouse paths now mean different things.** Double-click asks "the word I am
  pointing at" — position is the source of truth. Single click asks "what I selected"
  — the selection is. That makes the double-click gesture immune to every selection
  oddity, not just Shift's, including a stale selection left by a previous lookup.
- **`wordAtPoint` moved from fallback to primary**, which put two latent bugs on the
  hot path and so got them fixed: `\w` is ASCII-only and turned `björn` into `bjrn` in
  a *Swedish* dictionary, and the `caretPositionFromPoint` branch read a
  `CaretPosition` as if it were a `Range`.
- **Matching is exclusive.** `Alt+Shift+click` used to open a card and no longer does.
  With three modifiers to choose between, a permissive match would fire
  `Ctrl+Shift+click` for a Ctrl reader *and* a Shift reader, and compound chords are
  where browsers and pages put meanings of their own — Cmd+click opens a link in a new
  tab, and AltGr on Windows is literally Ctrl+Alt.
- **`preventDefault()` on a matched click** suppresses Alt+click-downloads-a-link and
  Ctrl+click-opens-a-background-tab, and the Shift-only mousedown one additionally
  costs focus-on-click and drag-start — all only while the trigger modifier is held,
  so ordinary interaction is untouched.
- **The `altKeyDown` keyboard tracker was deleted.** It existed as a "Mac
  compatibility" fallback, and it was stale state by construction: `keyup` is never
  delivered if the key is released while the document lacks focus, so one Alt+Tab left
  it stuck `true` and *any* plain double-click opened a card. Generalising it to three
  modifiers would have made Shift+Tab and Ctrl+Tab do the same. If a Mac regression
  ever does appear, the correct hedge is a `mousedown` snapshot, which cannot go stale
  because a mousedown must occur inside the gesture.
- **This is the extension's only `chrome.storage.onChanged` listener**, and it watches
  one key. Every other setting is re-read by the action that displays it, so staleness
  heals itself after one card. The trigger cannot work that way: a reader changes it
  precisely because their desktop intercepts the current one, so the page they were
  reading has no way to open a card and re-read on its own. Waiting would look exactly
  like the setting doing nothing. The cost is one listener per frame, firing on every
  local-storage write; the body is a single key check.
- **The shortcut is silent when nothing is selected.** Falling back to opening the
  Action Popup was rejected: on `chrome://` pages, the Web Store and the PDF viewer no
  frame ever answers, so the panel would fly open on every press. The Options page
  shows the live binding (`chrome.commands.getAll`) instead, which also covers the
  case where another extension already holds `Ctrl+Shift+L` and Chrome silently left
  ours unassigned.
- **`commands` is a manifest key, not a permission.** `permissions` is still exactly
  `["storage", "offscreen"]` and the install warning is unchanged. `ManifestTests`
  says so explicitly so nobody "fixes" the permission list to match.

## What the tests cannot prove

Playwright drives Chrome over CDP, which injects input *below* the layer where Ash and
Mutter take Alt + click. **The original bug is not reproducible in the test suite on
any platform**, and no test will ever fail because of it. The suite proves the trigger
is configurable, that a non-default modifier works where the default does not, that a
change reaches an already-open tab, that dismissal still works, and that the copy
tells the truth. Chrome's dispatch of a keystroke to `onCommand` is likewise not
reachable — `page.keyboard.press` goes to the renderer — so the command tests drive
the worker's handler directly and say so.

The interception itself is verified by hand, on the platform.

[#15]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/15
[#17]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/17
[#21]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/21

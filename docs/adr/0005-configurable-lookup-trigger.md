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

## The decision

Two routes, answering different halves of the problem:

1. **A configurable modifier** — Alt (default), Ctrl or Shift, in Options. Keeps the
   fast double-click-a-word flow and lets a reader route around whatever their desktop
   takes.
2. **A `chrome.commands` keyboard shortcut** — `translate-selection`, suggested at
   `Ctrl+Shift+L`. A browser-level shortcut is the one trigger no desktop can
   intercept, and Chrome supplies the rebinding UI at `chrome://extensions/shortcuts`
   for free, so the extension ships no key-capture widget of its own.

Alt stays the default, so a reader who was not blocked sees no change.

## Which modifiers are offered

**Ctrl is not offered on a Mac** (`availableModifiers`). macOS defines Ctrl + click as
the secondary click, so Chrome raises `contextmenu` off the mousedown and suppresses
the `click` entirely — no listener ordering recovers it. `Settings.getTriggerModifier`
falls back to Alt if it finds `ctrl` stored there anyway. A Mac needs no escape hatch:
Option + click, the default, works fine.

**Matching is exclusive** — `Alt+Shift+click` used to open a card and no longer does.
With three modifiers to choose between, a permissive match would fire
`Ctrl+Shift+click` for a Ctrl reader *and* a Shift reader, and compound chords are
where browsers and pages put meanings of their own: Cmd+click opens a link in a new
tab, and AltGr on Windows is literally Ctrl+Alt.

## Naming the word under the pointer

**The two mouse paths mean different things.** Double-click asks "the word I am
pointing at" — position is the source of truth. Single click asks "what I selected" —
the selection is. That makes the double-click gesture immune to every selection oddity,
including a stale selection left by a previous lookup.

Where the browser was allowed to make the selection, **its own is preferred**: it spans
inline elements, and its word segmentation knows more about language than a regular
expression ever will. `wordAtPoint` is the answer where the selection was suppressed
(see below), and the fallback where position cannot answer — `caretRangeFromPoint`
resolves points inside the viewport only, so a word below the fold has no caret.

### The rule `wordAtPoint` follows

**The walk has to agree with what the reader sees. Every disagreement shows up as a
lookup for a word that is not on the page.** Markup and rendering come apart in three
ways, and reasoning about the DOM finds none of them:

| Markup | Reader sees | Naive walk collects |
|---|---|---|
| `h<em>u</em>nd` | one word | `u` — one text node under the pointer |
| `bil<br>hund`, `bil<img>hund` | two words | `bilhund` — the gap carries no text |
| `h<span hidden>ZZZ</span>und` | one word | `h`/`und` — `display:none` is not inline |
| `bil<svg><title>ikon</title></svg>hund` | two words | `bilikonhund` — a name, not text |

So `wordAtPoint` reads the whole run of text a word sits in — walking the inline
elements inside the nearest block — and decides what ends that run **geometrically**,
never against a list of tag names:

- **Renders nothing** (`display: none`) → skipped outright, contributing neither text
  nor a boundary. This also keeps a mid-sentence `<script>`'s source out of the text.
- **Takes up room but draws no text** → a boundary. Asked as
  `getBoundingClientRect().width > 0` plus a `Range` around each text node to see
  whether any of it is drawn.
- **A `<br>`, or anything not inline** → a boundary, and not descended into.

Both halves of that middle test are load-bearing, because the obvious simplifications
are wrong in opposite directions: with no rule at all an icon is elided and
`bil<img>hund` reads as one word; with a naive "every textless element separates" rule,
`h<span></span>und` breaks into `und`. Geometry also gets `<svg>`, `<canvas>`,
`<video>`, form controls, custom elements and `::before` icons right without naming any
of them, and leaves `<wbr>` alone.

Moving `wordAtPoint` from fallback to primary put two latent bugs on the hot path and
so got them fixed: `\w` is ASCII-only and turned `björn` into `bjrn` in a *Swedish*
dictionary, and the `caretPositionFromPoint` branch read a `CaretPosition` as if it
were a `Range`.

## Keeping the trigger out of the page's way

**The default is suppressed as soon as the modifier matches**, ahead of every early
return. Once the modifier is held the gesture is the extension's, and the page does not
also get it — every trigger does something to a link (Ctrl+click opens a background
tab, Alt+click downloads, Shift+click opens a window), and the first click of a
double-click on a linked word would otherwise act before the lookup had decided what
the word was.

**`preventDefault()` on `mousedown` is applied for Shift only.** Shift + click's own
meaning is "extend the selection from the existing anchor", so without it a second
lookup selects everything between the two words and highlights half a paragraph. Alt
and Ctrl replace the selection rather than extending it, so they have nothing to fix —
and suppressing their default would throw away the browser's own double-click word
selection, which the dblclick path still wants. Leaving it alone for the shipped
trigger also means Alt behaves exactly as it always has.

The cost, for Shift only: a trigger-click no longer focuses what it lands on and cannot
start a drag.

## Telling a click from the first half of a double-click

A double-click arrives as click, click, dblclick.

- **Clicks carrying `detail > 1` are ignored** — the word they would look up is the
  dblclick handler's to name. This also fixes a pre-existing defect: every
  Alt+double-click had been making two dictionary requests and filing two identical
  history entries.
- **Under Shift, a click must have landed *on* the selection** to look it up. The
  mousedown suppression keeps an older selection alive, so the first click of a
  double-click aimed elsewhere would otherwise look up a word the reader chose some
  time ago. Where the click landed answers this at once — a reader looking their
  selection up clicks on it, and a reader starting a double-click elsewhere does not.

Waiting out a grace period to see whether a double-click follows was tried and
rejected: the double-click interval is the reader's to configure and Chrome does not
expose it (Windows allows up to five seconds), so any constant is a guess, and a
generous one makes the select-then-click flow feel broken.

## The keyboard shortcut

- **`commands` is a manifest key, not a permission.** `permissions` is still exactly
  `["storage", "offscreen"]` and the install warning is unchanged. `ManifestTests` says
  so explicitly, so nobody "fixes" the permission list to match.
- **Only the deepest focused frame answers.** Every document on the focused chain
  reports `hasFocus`, and each keeps whatever it had selected last — so a word selected
  in the page and another inside an iframe would otherwise have both opening a card and
  filing a history entry. A document whose own `activeElement` is a frame has handed
  focus on and stays quiet.
- **Silent when nothing is selected.** Falling back to opening the Action Popup was
  rejected: on `chrome://` pages, the Web Store and the PDF viewer no frame ever
  answers, so the panel would fly open on every press. The Options page shows the live
  binding (`chrome.commands.getAll`) instead, which also covers Chrome silently leaving
  the suggested combination unassigned because another extension holds it.

## Picking a change up without a reload

**This is the extension's only `chrome.storage.onChanged` listener**, and it watches one
key. Every other setting is re-read by the action that displays it, so staleness heals
itself after one card. The trigger cannot work that way: a reader changes it precisely
because their desktop intercepts the current one, so the page they were reading has no
way to open a card and re-read on its own. Waiting would look exactly like the setting
doing nothing.

The cost is one listener per frame, firing on every local-storage write; the body is a
single key check.

## The `altKeyDown` tracker was deleted

A "Mac compatibility" fallback, and stale state by construction: `keyup` is never
delivered if the key is released while the document lacks focus, so one Alt+Tab left it
stuck `true` and *any* plain double-click opened a card. Generalising it to three
modifiers would have made Shift+Tab and Ctrl+Tab do the same. Should a Mac regression
appear, the right hedge is a `mousedown` snapshot, which cannot go stale because a
mousedown must occur inside the gesture.

## Known limitations

- **`HistoryManager` does read-modify-write with no serialisation** ([#68]), so two
  lookups a few milliseconds apart can lose an entry.
- **A linked word cannot be double-clicked with Alt** ([#69]). Chrome aborts the gesture
  after the second `mousedown` on an `<a>` with Alt held — no second `click`, no
  `dblclick`, with or without the suppression above. Looking a linked word up has
  therefore never worked on the Alt path, and nothing here changes it.

The second is why the default suppression is tested on the event (`defaultPrevented`)
rather than on its consequence. The consequence differs by modifier and platform, and
two of the three are not observable in the harness at all: Ctrl is not offered on a Mac,
and Shift's own mousedown suppression masks it.

## What the tests cannot prove

Playwright drives Chrome over CDP, which injects input *below* the layer where Ash and
Mutter take Alt + click. **The original bug is not reproducible in the test suite on any
platform**, and no test will ever fail because of it. The suite proves the trigger is
configurable, that a non-default modifier works where the default does not, that a
change reaches an already-open tab, that dismissal still works, and that the copy tells
the truth. Chrome's dispatch of a keystroke to `onCommand` is likewise not reachable —
`page.keyboard.press` goes to the renderer — so the command tests drive the worker's
handler directly and say so.

The interception itself is verified by hand, on the platform.

[#15]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/15
[#17]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/17
[#21]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/21
[#68]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/68
[#69]: https://github.com/SergVro/Lexin-dictionary-Chrome-Extension/issues/69

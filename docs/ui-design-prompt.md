# Lexin Dictionary — UI design brief

I need UI sketches for every view of an existing Chrome extension. I want both a
credible redesign of what exists today **and** new ideas I haven't considered —
please push back on the current interaction model where it deserves it.

---

## 1. The product

**Lexin Dictionary** is a Chrome extension (Manifest V3) that translates Swedish
words into 20 other languages using two Swedish public dictionary services,
*Lexin* and *Folkets Lexikon*.

**Who uses it:** immigrants, students and language learners living in Sweden who
read Swedish web pages — news, myndighet letters, job ads, course material — and
hit an unfamiliar word every few paragraphs. They are mid-flow in someone else's
page; the extension is an interruption they invited, so it has to be fast,
legible and easy to dismiss. Many of them are reading in their second or third
language, and a good share are on a laptop with a trackpad.

**The core gesture:** Alt + double-click a word on any page → a small card appears
next to the word with the dictionary entry. Alternatives: select a word and
Alt + click it, or select a word and click the toolbar icon.

**Languages (20):** Albanian, Amharic, Arabic, Azerbaijani, Bosnian, Croatian,
English, Finnish, Greek, Kurdish (Kurmanji and Sorani), Pashto, Persian, Russian,
Serbian (Latin and Cyrillic), Somali, Spanish, Swedish (monolingual), Turkish,
Ukrainian. Note what that list implies: **RTL scripts** (Arabic, Persian, Pashto,
Sorani Kurdish) and **non-Latin scripts** (Amharic, Greek, Russian, Ukrainian,
Serbian Cyrillic) are first-class, not edge cases.

Everything is scoped to a **language direction** — a Swedish↔target pair such as
`swe_ara`. Within a direction, a lookup can run *from* Swedish or *to* Swedish.

---

## 2. What the dictionary actually returns (this constrains the design)

The extension does **not** parse the dictionary response into fields. It receives
third-party HTML and only styles it. A typical entry for the word *hem* arrives as
a sequence of `<p>` blocks that look like this, with `<br>` between lines:

> 🇸🇪 **hem** noun, 🇬🇧 **home**
> Pronunciation: [hem:] 🔊 Listen
> See Saldo: associations, inflections
> Inflections: hemmet, hem, hemmen
> Synonyms: bo, boning, bostad, hushåll, lya, revir
> Definition: ställe där man bor, permanent bostad (the place where one lives)
> Example: arbeta i hemmet (work at home), han kommer från ett gott hem
> Compounds: föräldrahem (parental home), hem|arbete (housework)

Then three or four more `<p>` blocks for the other senses, then the reverse
direction (English headword → Swedish equivalents). A common word produces
6–8 such blocks; a rare word produces one; a misspelled word produces none.

So the raw material is: small flag images, bold headwords, a part-of-speech,
labelled lines (`Pronunciation:`, `Inflections:`, `Synonyms:`, `Definition:`,
`Example:`, `Compounds:`, `Explanation:`), links to an audio file and to an
external morphology service, and an occasional inflection image.

**This matters for your sketches.** Any design that shows structured
elements — a sense-numbered list, chips for synonyms, a play button in a fixed
position, a collapsible "more senses" section — requires parsing markup that the
provider can change without notice. That's not a veto, it's a cost. **For each
idea that needs parsed data rather than styled markup, mark it
`[needs parsing]`** so I can judge the trade-off. Also sketch at least one
"styling only" version of the entry body that works if the HTML stays opaque.

---

## 3. The views to sketch

Four surfaces. The first two are the product; the last two are where it's
configured and explained.

### View A — Translation Card (the in-page floating card)

The most important view by far. Rendered by a content script into a shadow root
so the host page can't style it, positioned just above the clicked word, and
dismissed by clicking anywhere outside it.

- **Size today:** 320–420px wide, fixed 20em (~320px) tall scroll viewport, 12px
  radius, 1px `#E5E7EB` border, faint shadow.
- **Composition today:** none. There is no header, no close button, no indication
  of which word was looked up or which language pair is active — the card is
  100% dictionary markup, starting with a small Swedish flag image.
- **States to sketch:** loading (currently the literal text
  `Searching for 'hem'...`), one sense, many senses (scrolling), no result /
  network error, and a very short entry in a card that is taller than its content.
- **Context to sketch it in:** over a dense white article page, and over a dark
  page. It must be unmistakably *not part of the page* while staying quiet.
- **Positioning cases:** word near the top of the viewport, near the bottom, near
  the right edge; the card flips to fit.
- **Open questions I want ideas on:** Should it have a compact header (word +
  language pair + close + open-in-popup)? Should the height be fixed, or grow to
  fit up to a cap? Is there a lighter first step — a one-line inline result that
  expands on demand — for the common case where the reader needs one gloss and
  nothing else? How should a second card behave if the reader looks up a word
  *inside* the card (currently supported: clicking a word in the card looks it up)?

### View B — Action Popup (the toolbar panel)

Opens from the extension icon. Used when the reader wants to type a word rather
than click one, and as the entry point to history.

- **Size:** 320–420px wide; height capped by Chrome at 600px (currently 70% of
  screen height, capped).
- **Contents today, stacked vertically:** a text field labelled *From Swedish*, a
  second text field labelled *To Swedish*, a language `<select>` with a clock
  emoji next to it linking to the History page, a dismissible blue tip banner
  ("Tip: Try to use 'Alt + Double Click' on a word"), and the translation result
  area below. Lookup fires 500ms after typing stops, minimum two characters. If a
  word was selected on the page when the popup opened, it's translated
  immediately; otherwise the result area says "No word selected".
- **States to sketch:** empty / first open with no selection, typing, loading,
  result, no result, and the tip banner present vs. dismissed.
- **Open questions I want ideas on:** Two separate inputs for the two directions
  is the weakest part of this UI — what replaces it? A single field with a
  direction toggle or a swap button? Where do recent lookups belong — is the
  popup a better home for the last 5–10 words than a separate page? Is the
  language `<select>` right for a 20-item list, or does it want a searchable
  picker? Ctrl+←/→ steps back and forward through the session's lookups with no
  visible affordance — should there be one?

### View C — History Page (opens as a full browser tab)

Every lookup is stored per language direction. This page is where learners
harvest words for study.

- **Contents today:** a legacy Chrome-options-style header (an "Lexin" title bar
  with History / Options / Help tabs), a language `<select>`, a *Clear history*
  button with a `confirm()` dialog, a *Show date* checkbox, and a plain bordered
  table with Date / Word / Translation columns. Repeated dates are blanked so a
  day reads as a group. Empty state is a table row reading "No translations in
  history".
- **The real use case, and it's badly served:** users export to flashcards. The
  Help page tells them to *manually select the table, copy it, and paste it into
  Quizlet* with the right delimiter options — eight steps. There is no export
  button, no search, no filter by date, no per-row delete, no way to mark a word
  as learned, no count.
- **States to sketch:** empty (new user, no lookups yet), a handful of entries, a
  few hundred entries, and mid-export.
- **Open questions I want ideas on:** what does a study-oriented history look
  like — a table, a list of cards, a review deck? What's the export affordance
  and what formats (CSV, TSV, Anki, Quizlet, clipboard)? Selection model for
  exporting a subset? Does "per language direction" deserve tabs, a filter, or an
  all-languages view?

### View D — Options Page (opens as a full browser tab)

- **Contents today:** the same legacy header, then a single list of all 20
  languages. Each row has a **radio** (make this the default language) and a
  **checkbox** (show this language in the dropdowns), under a two-column heading
  reading "Language name / Enabled". The default language's checkbox is disabled
  and forced on. Below the list: an "Enable or Disable all" checkbox, a grey
  explanatory note, and an "Options saved" message that appears and fades after
  every change (saving is automatic — there is no Save button).
- **States to sketch:** default (most languages enabled), a user who has enabled
  only two or three, and the moment right after a change when the save
  confirmation shows.
- **Open questions I want ideas on:** radio + checkbox on the same row is a
  puzzle for anyone who doesn't already know what it means — what's the clearer
  model for "one default, N visible"? Should the 20 languages be searchable,
  grouped, or reorderable? There are currently **no other settings at all** —
  propose what belongs here (theme, the Alt+click gesture, card size and
  position, whether history is recorded, which dictionary to prefer).

### View E — Help Page (opens as a full browser tab)

Same header. Three prose sections: the three ways to trigger a translation, the
long Quizlet export walkthrough, and a list of external links. Sketch what
replaces it — a visual explanation of the gesture is worth more than a numbered
list, and most of the Quizlet section should be replaced by a working export
button in View C.

### Also worth a sketch (optional, if you have ideas)

A **first-run / onboarding** moment. Today, installing the extension puts an icon
in the toolbar and tells the user nothing; the only hint about Alt+double-click
is the dismissible banner inside the popup. What should the first thirty seconds
look like?

---

## 4. Cross-cutting requirements

**Two visual languages exist today, and that's a problem to solve.** The card and
popup were modernised: system font stack, `#2563EB` blue, Tailwind-ish greys
(`#111827` text, `#6B7280` secondary, `#E5E7EB` borders, `#FAFAFA` surface),
8–12px radii, 200ms transitions. The history/options/help pages were not: Arial,
a CSS-table layout, 1px `#D9D9D9` grid lines, and a Chrome-options-page header
from roughly 2012. **Unify them.** Propose the one design language, and show the
type scale, colour roles, spacing steps and the handful of components (button,
input, select, toggle, table row, tab, toast, empty state) as a compact style
tile alongside the view sketches.

**Dark mode.** Nothing supports it today. Every view needs a light and dark
treatment, and the card additionally has to sit legibly over a page that is
already dark.

**Internationalisation.**
- Right-to-left: the card inherits text direction from the host page, so the
  layout must work mirrored. Show at least the card and the popup in RTL with
  Arabic content.
- Non-Latin scripts: Amharic, Greek, Cyrillic. Don't pick a display font that
  can't set them; there's no web-font budget (see constraints).
- The UI chrome itself is English-only today. If your design makes localising it
  easier or harder, say so — text expansion of 30–40% is realistic.

**Accessibility.** WCAG AA contrast in both themes; visible focus rings (this is
a keyboard-heavy tool — the trigger is a modifier gesture); the card must be
reachable and dismissible by keyboard; the language list must be operable by
screen reader; the current UI leans on a raw emoji as an icon button, which
should go.

**Technical constraints — please design inside these, they're real:**
- No web fonts, no CDN, no external images. Extension CSP is `script-src 'self'`
  and the card is deliberately self-contained. Use a system font stack; icons
  must be inline SVG.
- No UI framework. Plain TypeScript and hand-written CSS, so favour designs a
  developer can build with flexbox/grid and CSS custom properties. Nothing that
  needs a component library or a layout engine.
- The card renders in a shadow root and cannot rely on anything from the host
  page. It must survive being placed on a page with an aggressive stylesheet, any
  zoom level, and any background colour.
- Popup height is hard-capped at 600px by Chrome. The card should stay under
  roughly 420px wide so it doesn't dominate the page it floats over.
- Two dictionaries (Lexin and Folkets Lexikon) back the results, and the UI
  currently never says which one answered or lets the user choose. Consider
  whether it should.

---

## 5. What I'd like back

For each view (A–E, plus onboarding if you take it on):

1. **An annotated sketch** at a realistic size — card at ~380×340, popup at
   ~400×560, extension pages in a ~1280×800 browser tab — with callouts
   explaining the intent behind the non-obvious decisions.
2. **The states listed for that view**, not just the happy path. Loading, empty,
   error and overflow are where this extension actually lives.
3. **Light and dark**, at least for the card and the popup.

Then, across the set:

4. **Two or three genuinely different directions for the Translation Card and the
   Action Popup** — not palette variations. One should be the conservative
   evolution of what exists; at least one should question the interaction model
   (for example: does the popup need to exist as a separate surface at all, or
   should the toolbar icon open the same card?).
5. **The style tile** described above.
6. **A short rationale** — what you think is wrong with the current UI, what you
   changed and why, and which of your ideas you'd ship first if only one shipped.
7. **Implementation flags:** mark anything `[needs parsing]` (requires
   structuring the third-party dictionary HTML), `[needs new data]` (requires
   storing something the extension doesn't store today, e.g. a learned/starred
   flag), or `[needs permission]` (requires a new Chrome permission — the
   extension currently asks only for `storage` and the two dictionary hosts, and
   I want to keep that list short).

Prioritise the Translation Card. It's what users see fifty times a day; the other
views they visit once a month.

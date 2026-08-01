# Adopt the Modernist design system through a local `--lx-` token layer

The extension shipped two visual languages. The Translation Card and the Action Popup
had been modernised — system font stack, `#2563EB` blue, Tailwind-ish greys, 8–12px
radii — while the History, Options and Help pages had not: Arial, a CSS-table layout,
1px `#D9D9D9` grid lines and a Chrome-options header from roughly 2012.

`docs/ui-design-prompt.md` asked for one language across all five surfaces. The answer
is **Modernist**, defined in the Claude Design project *Design specifications
annotated* and sketched across the five views in `Lexin UI Sketches.dc.html`: flat and
architectural, zero corner radius, strong 2px rules, one red accent `#ec3013`, and
neutral/accent ramps generated in OKLCH on a shared perceptual lightness scale.

It arrives here as `src/css/tokens.css`, which every other stylesheet reads from.

## Four deliberate divergences from the source stylesheet

The design project's `styles.css` is the source of truth for the *look*. It is not
copied verbatim, because four of its choices do not survive contact with a browser
extension. Anyone re-syncing from that project should keep these.

### 1. Archivo is replaced by the system font stack

`styles.css` opens with `@import url('https://fonts.googleapis.com/css2?family=Archivo…')`.

- The card renders into a shadow root on **every page the reader visits**. A web font
  would mean a request to Google from all of them.
- Extension pages run under `script-src 'self'`, and the design brief rules out web
  fonts, CDNs and external images outright.
- Twenty languages including Amharic, Greek, Cyrillic and four RTL scripts. The system
  stack sets all of them; one display face would not.

Archivo's weight is carried instead by `--lx-font-heading-weight: 700` (the system
stack rarely offers Archivo's 800) plus `--lx-heading-tracking: -0.015em`.

### 2. Token names are prefixed `--lx-`

Custom properties inherit **through** a shadow boundary. A page that happens to define
`--color-accent` on `html` would reach into the card, because the host's inline
`all: initial !important` is not specified to reset custom properties.

Two defences, deliberately overlapping:

- Every token is declared **on `.lexinTranslationContainer` itself**, not merely
  inherited. A declaration on the element beats anything arriving by inheritance, so
  no page value can win for a token we declare.
- The `--lx-` prefix covers the case we did not think of — a token added later and
  forgotten in one of the two selector blocks.

`tokens.css` therefore declares its variables against `:root, .lexinTranslationContainer`.
Inside a shadow root `:root` matches nothing (the shadow root is not a document), so
the second selector is what makes one file serve both contexts.

### 3. `--lx-divider` is solid, not `color-mix(… 40%, transparent)`

The source defines the divider as translucent ink. A translucent rule takes the colour
of whatever is behind it — and the card floats over pages we do not control, dark ones
included. The token is a solid value per theme, chosen to match what the source's
`color-mix` resolves to over that theme's ground.

### 4. Dark mode is opt-in per element, not a bare media query

Dark flips on `[data-lx-theme="dark"]`, written by `ThemeManager.applyTheme`.

A plain `@media (prefers-color-scheme: dark)` block would darken the tokens under the
Options, History and Help pages — whose own stylesheets still hard-code light
colours — and leave them half-dark until each is converted. The attribute lets the
surfaces adopt the system one at a time. The Translation Card opts in today.

The attribute's value comes from the stored **Appearance** setting (`light` / `dark` /
`system`, default `system`), which resolves through `prefers-color-scheme`. The setting
is read today and written by the Options page redesign.

## The sheets, and the order they load in

```
tokens.css              variables only
components.css          .lxButton .lxInput .lxField .lxSeg .lxChip .lxState .lxSpinner
                        .lxNav .lxToolbar .lxTable .lxDialog .lxToast .lxHr
card.css                Translation Card chrome, shadow root only
translation-content.css the dictionary's own markup, card + Action Popup
<surface>.css           layout for one surface
```

Extension pages `<link>` them in that order; the card concatenates the first four into
its adopted stylesheet in `ContentScript.getCardStyleSheet`. A component belongs in
`components.css` once a second surface needs it — the empty, loading and error states
moved there the moment the Action Popup grew its own, so that one lookup does not look
like two different products depending on where it renders.

## Consequences

- `src/css/tokens.css` must be loaded by any surface that uses the other sheets.
- **A themed document must also reach `.lexinTranslationContainer`.** Because the light
  block declares every token *on* that element, it resets itself to light inside a dark
  page unless the dark block also matches it as a descendant — which is why
  `:root[data-lx-theme="dark"] .lexinTranslationContainer` is in there. Without it the
  Action Popup's whole result area rendered light ink on a dark ground.
- **Card chrome classes need the container prefix; shared components need non-`div`
  elements.** `.lexinTranslationContainer div` / `p` in the shared sheet zeroes padding
  and repaints colour at `(0,1,1)`. Prefixed card classes reach `(0,2,0)` and win;
  `components.css` classes cannot be prefixed, so the markup that uses them inside the
  card is `<section>` and `<span>`, which those selectors do not match.
- **`[hidden]` is forced to `display: none`.** The attribute carries only a UA
  `display: none`, which any later `.lxSomething { display: flex }` beats on source
  order — elements the code had hidden stayed on screen.
- `translation-content.css` is shared by the card and the Action Popup, so it may only
  use tokens both surfaces resolve — no card-only assumptions.
- Card chrome classes (`.lexinCardHeader`, `.lexinCardButton`, …) all carry the
  `.lexinTranslationContainer` prefix. Without it they tie at `(0,1,1)` against
  `.lexinTranslationContainer div` / `p` in the shared sheet, which zeroes padding and
  repaints colour — the same trap already documented above the card's scroll viewport.
- Tests that pinned the old identity moved with it: card radius `12px → 0px`, ink
  `#111827 → #201e1d`, links `#2563EB → #ae1800`, bold `600 → 700`, content viewport
  `20em → --lx-card-max-height`.

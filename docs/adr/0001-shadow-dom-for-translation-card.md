# Render the Translation Card in a shadow root, with its CSS inlined at build time

On some sites the Translation Card rendered with the host page's typography, colours
and spacing instead of its own. The card was a plain `div` in the page's DOM, defended
only by class-scoped stylesheets injected page-wide, which lost to any host rule with
higher specificity or `!important`. The card now renders inside an open shadow root
whose stylesheet is inlined into the content script bundle at build time.

## The three leaks

They are independent, and only the first two are solved by the shadow boundary:

1. **Specificity.** `.yui3-cssreset p` and `.lexinTranslationContainer p` are both
   `(0,1,1)`. A host rule of `#main p`, or anything carrying `!important`, won.
   Being an extension confers no priority — content script CSS is ordinary author CSS.
2. **Inheritance.** The YUI reset only zeroed `margin`, `padding`, `list-style`,
   `font-weight` and `font-style` on a fixed element list. `color`, `font-size`,
   `line-height`, `letter-spacing`, `text-transform` and `background` inherited from
   `<body>` untouched, and `span` and `img` — the two most common elements in the
   Translation Markup — were styled by nothing at all.
3. **Containing block.** The card is `position: fixed`. Any ancestor carrying
   `transform`, `filter`, `perspective`, `backdrop-filter`, `contain` or `will-change`
   becomes its containing block, and the card is positioned against that ancestor
   rather than the viewport. **Containing blocks propagate through a shadow boundary,
   so Shadow DOM does not fix this on its own.**

   Note the scope of what is fixed. The card's host is a `div` appended to `<body>`,
   so a page rule of `div { transform: … }`, `* { … }` or `body > * { … }` hits the
   host itself — that is the common case, and neutralising the host closes it. A
   `transform` on `body` or `html` *directly* is **not** fixed: those are the page's
   own elements, the card is necessarily their descendant, and no amount of isolation
   short of abandoning fixed positioning would help. An iframe would fare no better.
   That case is known, rare, and accepted.

## Why the host element is neutralised with an inline `all: initial !important`

Vector 3 requires the *host* element — which necessarily lives in the page's DOM — to
be stripped of anything that could establish a containing block. Two things follow
that are easy to "clean up" and must not be:

- **It cannot be `:host { all: initial }` in the shadow stylesheet.** Declarations
  from the outer document that target the host element beat `:host` rules. A page rule
  of `div { transform: … }` would win, and vector 3 would reopen.
- **It cannot be a plain inline style.** A style-attribute declaration outranks
  selector-based author rules at the same importance, but a page's `!important` rule
  outranks a normal inline one. Only `setProperty(…, 'important')` — inline *and*
  important — sits above every author declaration a page can write.

`all` deliberately does **not** reset `direction` or `unicode-bidi` (CSS Cascade L4
§3.3), so the card continues to inherit text direction from the page as it always has.
That is why `text-align` is `start` rather than `left`: alignment follows the direction
that is still being inherited, instead of contradicting it. This is not RTL support —
the four RTL Language Directions are not otherwise handled.

## Why the CSS is inlined at build time rather than linked

The obvious way to style a shadow root from an extension is
`<link href="chrome.runtime.getURL('card.css')">`. **That requires
`web_accessible_resources`, which `tests/unit/ManifestTests.ts` forbids** — a store
submission was previously rejected over an over-broad manifest surface, and exposing a
resource also leaks the extension ID to every page for fingerprinting. It would also
load asynchronously, flashing an unstyled card.

So the stylesheets are imported into TypeScript as strings and adopted as a
constructable stylesheet. `tsc` emits the import specifier untouched and esbuild
bundles from `dist/temp/`, where no `css/` directory exists — hence the `onResolve`
hook in `build.js` mapping `.css` specifiers back to `src/css/`, and the matching case
in the `vitest.config.ts` loader plugin so unit tests resolve them the same way.

## Consequences

- `content_scripts[0].css` in the manifest is now empty and the key is gone: the
  extension injects **no** stylesheet into any page it visits. The host element is
  styled inline, everything else lives in the shadow root. A ManifestTests case guards
  this, because re-adding a stylesheet there would be silently ineffective.
- The `#translation` ID is now scoped to the shadow tree and can no longer collide
  with a host page's own `#translation` element.
- Anything reaching into the card from the page's DOM must traverse `.shadowRoot`
  explicitly. Playwright *locators* pierce open roots automatically, but
  `document.querySelector` inside `page.evaluate` does not.
- The root is **open**, not closed. A closed root would hide the card from the e2e
  suite while giving no extra protection — a page cannot style into an open root either.

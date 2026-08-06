# Chrome Web Store assets

The images on the store listing, and the script that makes them. Kept here for the
same reason `../store-listing.md` is: the store's own editor has no history, so
whatever is uploaded there cannot be diffed, reviewed, or traced back to a release.

## Regenerating

```sh
npm run store-assets
```

Builds the extension, loads it into a real Chrome, drives each surface, and writes
`screenshots/` and `promo/`. Takes about a minute and needs a network connection - the
entries in the pictures are fetched live from Lexin and Folkets Lexikon, exactly as a
reader's would be. A browser window opens while it runs; Chrome will not load an
extension in headless mode.

## What goes where in the dashboard

| Asset | Size | Field |
|---|---|---|
| `screenshots/1-translation-card.png` | 1280x800 | Screenshots |
| `screenshots/2-action-popup.png` | 1280x800 | Screenshots |
| `screenshots/3-history-page.png` | 1280x800 | Screenshots |
| `screenshots/4-options-page.png` | 1280x800 | Screenshots |
| `screenshots/5-lookup-trigger.png` | 1280x800 | Screenshots |
| `promo/small-promo-tile.png` | 440x280 | Small promo tile |
| `promo/marquee-promo-tile.png` | 1400x560 | Marquee promo tile |

Five screenshots is the store's maximum, so a sixth surface displaces one rather than
joining them.

Upload the screenshots in filename order. All seven are 24-bit PNG without alpha, which
is what the dashboard asks for; `capture.mjs` checks both the size and the absence of
alpha before writing each file, and fails rather than producing an asset that would be
rejected. Chrome always screenshots to RGBA, so `png.mjs` re-encodes.

The small tile is required before the listing can be published; the marquee is only
used if the extension is ever featured, but is worth having ready.

## What is staged, and what is not

Every pixel of interface in the screenshots is the built extension, driven the way a
reader drives it - the card is summoned with a real Alt+double-click, and the
dictionary entries are the live ones. Four things are arranged, because a fresh
profile has none of them:

- **The reader's stored state** - default language, direction, appearance - written
  into `chrome.storage` the way `tests/e2e/fixtures.ts` writes it.
- **The history rows**, likewise, and dated to fall on three separate days so the
  History page's date grouping is visible.
- **The page the card floats over**, `pages/article.html`. Deliberately anonymous: no
  masthead, no logo, no byline, because borrowing a real publication's look as the
  setting for our own listing would be passing off their brand as ours.
- **The platform, in `5-lookup-trigger.png` alone.** `navigator.platform` is overridden
  to Windows for that one capture. The Options page asks which modifiers the desktop
  can deliver and offers a Mac only Option and Shift, so a picture taken from the
  machine these assets are generated on would print Mac key names for an audience that
  is mostly not on a Mac, and would hide Ctrl from the ChromeOS readers the setting
  exists for. The page still decides for itself; it is only being told where it is
  running. See `captureTrigger` for why the keyboard shortcut field is left out of
  that crop.

The promo tiles show no interface at all - the store's advice for these is a brand
image rather than a screenshot, and the small tile is often drawn at a fraction of
440x280, where a dictionary entry is grey mush. What they do show is real: the five
translations of *hund* on the marquee are looked up through the extension while the
tiles are generated, so a word printed in a script nobody here reads is still one the
dictionary stands behind.

The words are chosen for the *size* of their entries, not their meanings. See the
comments on `CARD_WORD` and `POPUP_WORD` in `capture.mjs`, and on `PROMO_WORD` and
`MARQUEE_LANGUAGES` in `promo.mjs`, before changing any of them.

## The files

| | |
|---|---|
| `capture.mjs` | Drives the extension, then composes every asset |
| `tile.mjs` | The 1280x800 screenshot canvas |
| `promo.mjs` | The two promo tiles |
| `tokens.mjs` | The design tokens, mirrored from `src/css/tokens.css` |
| `asset.mjs` | Renders an asset, checks it, writes it |
| `png.mjs` | RGBA to 24-bit, covered by `tests/unit/StoreScreenshotPngTests.ts` |
| `pages/article.html` | The page the Translation Card is photographed over |

(All under `scripts/store-assets/`.)

## When to regenerate

Whenever a surface changes shape - and in the same pull request, alongside the
`store-listing.md` copy. The captions make claims ("21 dictionaries", "Export ... TSV,
Anki .txt, CSV", "Ctrl or Shift"), and those claims are checked by nothing but a
reader's eye.

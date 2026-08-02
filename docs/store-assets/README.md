# Chrome Web Store assets

The screenshots on the store listing, and the script that makes them. Kept here for
the same reason `../store-listing.md` is: the store's own editor has no history, so
whatever is uploaded there cannot be diffed, reviewed, or traced back to a release.

## Regenerating

```sh
npm run screenshots
```

Builds the extension, loads it into a real Chrome, drives each surface, and writes
`screenshots/*.png`. Takes about a minute and needs a network connection - the entries
in the pictures are fetched live from Lexin and Folkets Lexikon, exactly as a reader's
would be. A browser window opens while it runs; Chrome will not load an extension in
headless mode.

Upload the four files in `screenshots/`, in filename order, under *Store listing →
Screenshots* in the developer dashboard.

## What the store requires

| | |
|---|---|
| Size | 1280x800 or 640x400, and every asset here is 1280x800 |
| Format | 24-bit PNG with no alpha, or JPEG |
| Count | Up to 5. At least one is required, and 4 or 5 is what the listing page lays out well |

`capture.mjs` checks the size and the absence of alpha before writing each file, and
fails rather than producing an asset the dashboard would reject. Chrome always
screenshots to RGBA, so `png.mjs` re-encodes.

## What is staged, and what is not

Every pixel of interface in these pictures is the built extension, driven the way a
reader drives it - the card is summoned with a real Alt+double-click, and the
dictionary entries are the live ones. Three things are arranged, because a fresh
profile has none of them:

- **The reader's stored state** - default language, direction, appearance - written
  into `chrome.storage` the way `tests/e2e/fixtures.ts` writes it.
- **The history rows**, likewise, and dated to fall on three separate days so the
  History page's date grouping is visible.
- **The page the card floats over**, `pages/article.html`. Deliberately anonymous: no
  masthead, no logo, no byline, because borrowing a real publication's look as the
  setting for our own listing would be passing off their brand as ours.

The two words looked up are chosen for the *size* of their dictionary entries, not
their meanings. See the comments on `CARD_WORD` and `POPUP_WORD` in `capture.mjs`
before changing either.

## When to regenerate

Whenever a surface changes shape - and in the same pull request, alongside the
`store-listing.md` copy. The captions on the tiles make claims ("21 dictionaries",
"Export ... TSV, Anki .txt, CSV"), and those claims are checked by nothing but a
reader's eye.

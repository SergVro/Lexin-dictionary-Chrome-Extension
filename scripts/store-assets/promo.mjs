/*
 * The two promotional tiles: the small one that sits in the store's grids, and the
 * marquee used if the extension is ever featured.
 *
 * Neither shows the interface. The store's own advice for these is a brand image
 * rather than a screenshot, and it is right for a reason particular to this listing:
 * the small tile is often drawn at a fraction of its 440x280, where a screenshot of a
 * dictionary entry is grey mush. So both tiles are typographic, and the picture they
 * make is the product's one sentence - a Swedish word, and what it comes back as.
 *
 * The translations are not written here. They are looked up in the real dictionaries
 * while the tiles are generated, for the same reason the screenshots are of the real
 * extension: a promotional claim in a language nobody on the project reads is exactly
 * the kind of thing that is wrong for years without anyone noticing.
 */

import { TOKENS, escapeHtml } from "./tokens.mjs";

export const SMALL = { width: 440, height: 280 };
export const MARQUEE = { width: 1400, height: 560 };

/** The word both tiles are built around. Short, concrete, and known in every one of
 *  the twenty languages - which a word like "tidtabell" is not. */
export const PROMO_WORD = "hund";

/**
 * The languages the marquee lists, in the order it lists them.
 *
 * Chosen for their scripts rather than for the size of their speaker populations:
 * Latin, Cyrillic, Arabic (which sets right to left), Greek and Ge'ez, so that the
 * strip shows at a glance what "21 languages" is actually offering. Reading them is
 * not the point; recognising your own is.
 */
export const MARQUEE_LANGUAGES = ["swe_eng", "swe_ukr", "swe_ara", "swe_gre", "swe_amh"];

const STYLE = `
  ${TOKENS}

  /* Sized off the viewport, not off an ancestor: the viewport is set to the asset's
     exact dimensions, and body has no height of its own to inherit from. */
  .promo {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand img {
    display: block;
  }

  .brandName {
    font-weight: var(--heading-weight);
    letter-spacing: var(--heading-tracking);
  }

  /* The word pair: the whole proposition in four syllables. The arrow is the only
     accent-coloured thing on the small tile, so it is what the eye lands on. */
  .pair {
    display: flex;
    align-items: baseline;
    font-weight: var(--heading-weight);
    letter-spacing: var(--heading-tracking);
    margin: 0;
  }

  .pair .arrow {
    color: var(--accent);
  }

  /* ---- Small tile, 440x280 ---- */

  .small {
    display: flex;
    flex-direction: column;
    padding: 34px 36px;
  }

  .small .brand img { width: 30px; height: 30px; }
  .small .brandName { font-size: 20px; }
  .small .pair { font-size: 44px; gap: 14px; margin-top: 34px; }
  .small .accentBar { width: 48px; height: 5px; margin-top: 30px; }
  .small .subhead { font-size: 15px; margin-top: 20px; max-width: 330px; }

  /* ---- Marquee, 1400x560 ---- */

  /* Padding is wider than the composition needs. A marquee is cropped to fit whatever
     the store's featured strip is that week, and it is cropped from the sides. */
  .marquee {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 120px;
  }

  .marquee .left { width: 620px; flex: none; }
  .marquee .brand img { width: 54px; height: 54px; }
  .marquee .brandName { font-size: 30px; }
  .marquee .accentBar { width: 80px; height: 7px; margin: 34px 0 26px; }
  .marquee .headline { font-size: 46px; }
  .marquee .subhead { font-size: 21px; margin-top: 22px; max-width: 580px; }
  .marquee .eyebrow { font-size: 15px; }

  /* The list of what one word comes back as. A rule down its left edge rather than a
     panel: a panel would read as a screenshot of something, which is what these tiles
     are meant not to be. */
  .stack {
    border-left: 3px solid var(--ink);
    padding: 4px 0 4px 34px;
  }

  .stack .source {
    font-size: 54px;
    font-weight: var(--heading-weight);
    letter-spacing: var(--heading-tracking);
    line-height: 1.15;
    margin: 0;
  }

  .stack .sourceLabel {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .stack ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .stack li {
    display: flex;
    align-items: baseline;
    gap: 20px;
    margin-top: 17px;
  }

  .stack .arrow {
    color: var(--accent);
    font-size: 26px;
    line-height: 1;
    flex: none;
  }

  /* Left-aligned within a fixed width so the language names line up under each other
     however wide the translation is.
     Both bidi properties are load-bearing, and for different reasons. The isolate
     stops the Arabic dragging the name that follows it to the wrong side of the row.
     The explicit left alignment is what keeps the Arabic at the start of its own box:
     dir=auto resolves to rtl for it, and the default alignment of start would then
     push it to the far right and open a 250px hole in the column. Its letters still
     set right to left inside the box, which is the part not to override. */
  .stack .word {
    font-size: 31px;
    line-height: 1.25;
    unicode-bidi: isolate;
    text-align: left;
    min-width: 190px;
  }

  .stack .code {
    color: var(--ink-muted);
    font-size: 15px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
`;

function page(body) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${STYLE}</style></head>
<body>${body}</body>
</html>`;
}

/** The 440x280 tile: brand, one word pair, one line. */
export function smallPromoHtml({ icon, word, translation, subhead }) {
    return page(`
  <div class="promo small">
    <div class="brand">
      <img src="${icon}" alt="">
      <span class="brandName">Lexin dictionary</span>
    </div>
    <p class="pair">
      <span>${escapeHtml(word)}</span>
      <span class="arrow">→</span>
      <span>${escapeHtml(translation)}</span>
    </p>
    <div class="accentBar"></div>
    <p class="subhead">${escapeHtml(subhead)}</p>
  </div>`);
}

/** The 1400x560 tile: the same idea with room for the languages to speak for it. */
export function marqueePromoHtml({ icon, word, translations, headline, subhead }) {
    const rows = translations.map((row) => `
        <li>
          <span class="arrow">→</span>
          <span class="word" dir="auto">${escapeHtml(row.text)}</span>
          <span class="code">${escapeHtml(row.label)}</span>
        </li>`).join("");

    return page(`
  <div class="promo marquee">
    <div class="left">
      <div class="brand">
        <img src="${icon}" alt="">
        <span class="brandName">Lexin dictionary</span>
      </div>
      <div class="accentBar"></div>
      <h1 class="headline">${escapeHtml(headline)}</h1>
      <p class="subhead">${escapeHtml(subhead)}</p>
    </div>
    <div class="stack">
      <p class="eyebrow sourceLabel">Swedish</p>
      <p class="source">${escapeHtml(word)}</p>
      <ul>${rows}
      </ul>
    </div>
  </div>`);
}

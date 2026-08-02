/*
 * The 1280x800 canvas a captured surface is mounted on.
 *
 * The Chrome Web Store shows these at three sizes - a small tile in search results, a
 * strip on the listing page, and full size in the lightbox - so each one carries its
 * own headline. A bare UI capture says nothing at tile size, where the interface
 * itself is illegible.
 */

import { TOKENS, escapeHtml } from "./tokens.mjs";

/** Chrome Web Store screenshot dimensions. The only other legal size is 640x400. */
export const TILE = { width: 1280, height: 800 };

const STYLE = `
  ${TOKENS}

  html, body {
    width: ${TILE.width}px;
    height: ${TILE.height}px;
    overflow: hidden;
  }

  .tile {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--ground);
    overflow: hidden;
  }

  /* The one piece of colour on the canvas, in the shape Modernist uses everywhere: a
     hard rule, no radius. */
  .accentBar {
    width: 56px;
    height: 5px;
    margin-bottom: 22px;
  }

  .eyebrow { font-size: 13px; margin-bottom: 14px; }
  .headline { margin-bottom: 16px; }

  /* A captured surface is a physical thing sitting on the canvas: hairline edge, and
     a shadow long enough to read at this size. */
  .shot {
    display: block;
    border: 1px solid var(--divider);
    box-shadow: var(--lift);
    background: var(--surface);
  }

  /* ---- Stacked: headline across the top, capture below, bleeding off the bottom
     edge. For captures wider than they are tall. ---- */

  .stacked .copy {
    position: absolute;
    top: 68px;
    left: 76px;
    right: 76px;
  }

  .stacked .headline { font-size: 44px; max-width: 940px; }
  .stacked .subhead { font-size: 20px; max-width: 780px; }

  .stacked .shotWrap {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  /* A second cut-out laid over the first, for a detail that is real but too far down
     its own page to be in the same frame. Its heavier shadow separates the planes. */
  .inset {
    position: absolute;
    display: block;
    border: 1px solid var(--divider);
    box-shadow: var(--lift-near);
    background: var(--surface);
  }

  /* ---- Split: headline in a left column, capture standing full height on the
     right. For the Action Popup, which is taller than it is wide. ---- */

  .split .copy {
    position: absolute;
    top: 50%;
    left: 76px;
    width: 520px;
    transform: translateY(-50%);
  }

  .split .headline { font-size: 42px; }
  .split .subhead { font-size: 19px; }

  .split .shotWrap {
    position: absolute;
    top: 50%;
    right: 96px;
    transform: translateY(-50%);
  }
`;

/**
 * Builds one tile.
 *
 * `shot` is the captured PNG as a data URI, and `placement` says how big to draw it:
 * `width` for the stacked layout, `height` for the split one. Captures are taken at a
 * device scale factor of 2, so anything up to twice the captured CSS size still lands
 * on a whole device pixel here.
 */
export function tileHtml({ layout, eyebrow, headline, subhead, shot, placement, inset }) {
    const size = placement.width !== undefined
        ? `width: ${placement.width}px;`
        : `height: ${placement.height}px;`;
    const top = placement.top !== undefined ? `top: ${placement.top}px;` : "";
    const insetTag = inset
        ? `<img class="inset" src="${inset.shot}" alt=""
             style="width: ${inset.width}px; top: ${inset.top}px; right: ${inset.right}px;">`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${STYLE}</style></head>
<body>
  <div class="tile ${layout}">
    <div class="copy">
      <div class="accentBar"></div>
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h1 class="headline">${escapeHtml(headline)}</h1>
      <p class="subhead">${escapeHtml(subhead)}</p>
    </div>
    <div class="shotWrap" style="${top}">
      <img class="shot" src="${shot}" style="${size}" alt="">
    </div>
    ${insetTag}
  </div>
</body>
</html>`;
}

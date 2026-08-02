/*
 * The 1280x800 canvas a captured surface is mounted on.
 *
 * The Chrome Web Store shows these at three sizes - a small tile in search results,
 * a strip on the listing page, and full size in the lightbox - so each one carries
 * its own headline. A bare UI capture says nothing at tile size, where the interface
 * itself is illegible.
 *
 * Styling repeats the values from src/css/tokens.css rather than importing them:
 * this HTML is rendered by a browser with no extension loaded and no access to the
 * extension's origin. The comments below name the token each value came from so the
 * two can be reconciled when the design language moves.
 */

/** Chrome Web Store screenshot dimensions. The only other legal size is 640x400. */
export const TILE = { width: 1280, height: 800 };

const STYLE = `
  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    width: ${TILE.width}px;
    height: ${TILE.height}px;
    overflow: hidden;
  }

  .tile {
    position: relative;
    width: 100%;
    height: 100%;
    /* --lx-surface-sunken */
    background: #f3f2f2;
    /* --lx-font-body */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif;
    /* --lx-text */
    color: #201e1d;
    overflow: hidden;
  }

  /* The one piece of colour on the canvas, in the shape Modernist uses everywhere:
     a hard rule, no radius. --lx-accent. */
  .accentBar {
    width: 56px;
    height: 5px;
    background: #ec3013;
    margin-bottom: 22px;
  }

  .eyebrow {
    /* --lx-accent-text: the only accent step with enough contrast for small type */
    color: #ae1800;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0 0 14px;
  }

  .headline {
    /* --lx-font-heading-weight, --lx-heading-tracking */
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.1;
    margin: 0 0 16px;
  }

  .subhead {
    /* --lx-text-muted */
    color: #605d5d;
    line-height: 1.5;
    margin: 0;
  }

  /* A captured surface is a physical thing sitting on the canvas: hairline edge in
     --lx-divider, and a shadow scaled up from --lx-shadow-md for the larger canvas. */
  .shot {
    display: block;
    border: 1px solid #a6a5a5;
    box-shadow: 0 18px 44px rgba(45, 43, 43, 0.18);
    background: #ffffff;
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
     its own page to be in the same frame. Its heavier shadow is what separates the
     two planes. */
  .inset {
    position: absolute;
    display: block;
    border: 1px solid #a6a5a5;
    box-shadow: 0 24px 56px rgba(45, 43, 43, 0.28);
    background: #ffffff;
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

function escapeHtml(text) {
    return text.replace(/[&<>"]/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
    })[c]);
}

/**
 * Builds one tile.
 *
 * `shot` is the captured PNG as a data URI, and `placement` says how big to draw it:
 * `width` for the stacked layout, `height` for the split one. Captures are taken at
 * a device scale factor of 2, so anything up to twice the captured CSS size still
 * lands on a whole device pixel here.
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

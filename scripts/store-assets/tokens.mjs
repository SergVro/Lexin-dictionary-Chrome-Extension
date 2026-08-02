/*
 * The design tokens the store assets are drawn with.
 *
 * These repeat values from src/css/tokens.css rather than importing them. The assets
 * are rendered by a browser with no extension loaded and no access to the extension's
 * origin, so the stylesheet is out of reach - and half of what is here (canvas
 * dimensions, the shadows a 1280px canvas needs) has no business in the extension's
 * own token layer anyway.
 *
 * Names are the token names with the --lx- prefix dropped. Anything that has no
 * counterpart in the extension is marked as belonging to the canvas.
 */

export const TOKENS = `
  :root {
    --ink: #201e1d;                 /* --lx-text */
    --ink-muted: #605d5d;           /* --lx-text-muted */
    --ground: #f3f2f2;              /* --lx-surface-sunken */
    --surface: #ffffff;             /* --lx-surface */
    --divider: #a6a5a5;             /* --lx-divider */
    --accent: #ec3013;              /* --lx-accent */
    --accent-text: #ae1800;         /* --lx-accent-text, the only step with enough
                                       contrast for small type */

    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            "Helvetica Neue", sans-serif;
    --heading-weight: 700;          /* --lx-font-heading-weight */
    --heading-tracking: -0.015em;   /* --lx-heading-tracking */

    /* Canvas only. --lx-shadow-md is sized for a 380px card; a capture standing on a
       1280px canvas needs a longer throw to sit on it rather than hover. */
    --lift: 0 18px 44px rgba(45, 43, 43, 0.18);
    --lift-near: 0 24px 56px rgba(45, 43, 43, 0.28);
  }

  * { box-sizing: border-box; }

  html, body { margin: 0; padding: 0; }

  body {
    font-family: var(--font);
    color: var(--ink);
    background: var(--ground);
  }

  /* Modernist rounds no corner anywhere - --lx-radius is 0 on purpose. */
  .accentBar {
    background: var(--accent);
  }

  .eyebrow {
    color: var(--accent-text);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0;
  }

  .headline {
    font-weight: var(--heading-weight);
    letter-spacing: var(--heading-tracking);
    line-height: 1.1;
    margin: 0;
  }

  .subhead {
    color: var(--ink-muted);
    line-height: 1.5;
    margin: 0;
  }
`;

/** Escapes text going into a template. Translations arrive from a third party. */
export function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
    })[c]);
}

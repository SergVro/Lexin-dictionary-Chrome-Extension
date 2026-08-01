/**
 * Inline SVG icons for the extension's own chrome.
 *
 * Inline, not files: the Translation Card renders in a shadow root and an <img src>
 * pointing at the extension would need web_accessible_resources - forbidden by
 * ManifestTests, and it would leak the extension ID to every page. See
 * docs/adr/0001-shadow-dom-for-translation-card.md.
 *
 * Geometry is Lucide (https://lucide.dev), the icon set the Modernist system calls
 * for. Strokes take `currentColor` so an icon inherits whichever theme its button
 * resolved to.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

function createSvg(size: number, attributes?: Record<string, string>): SVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", size.toString());
    svg.setAttribute("height", size.toString());
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    // Decorative: every icon here sits inside a control that carries its own label.
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
            svg.setAttribute(key, value);
        }
    }
    return svg;
}

function withPath(svg: SVGElement, d: string): SVGElement {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return svg;
}

function withCircle(svg: SVGElement, cx: number, cy: number, r: number): SVGElement {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", cx.toString());
    circle.setAttribute("cy", cy.toString());
    circle.setAttribute("r", r.toString());
    svg.appendChild(circle);
    return svg;
}

/** Lucide "maximize-2" - open this lookup in the Action Popup. */
export function maximize(size: number = 16): SVGElement {
    return withPath(createSvg(size), "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7");
}

/** Lucide "x" - dismiss the card. */
export function close(size: number = 16): SVGElement {
    return withPath(createSvg(size), "M18 6 6 18M6 6l12 12");
}

/** Lucide "triangle-alert" - the card could not reach the dictionary. */
export function alert(size: number = 22): SVGElement {
    const svg = withPath(createSvg(size), "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z");
    withPath(svg, "M12 9v4");
    withPath(svg, "M12 17h.01");
    return svg;
}

/**
 * Lucide "arrow-right-left" - flip the lookup direction.
 *
 * Mirroring is left to `direction: rtl`, which flips the whole row: the arrows point
 * the way the reader's script runs.
 */
export function swap(size: number = 16): SVGElement {
    return withPath(createSvg(size),
        "M17 3 21 7l-4 4M21 7H9a4 4 0 0 0-4 4v1M7 21 3 17l4-4M3 17h12a4 4 0 0 0 4-4v-1");
}

/** Lucide "settings" - open the Options page. */
export function settings(size: number = 16): SVGElement {
    const svg = withCircle(createSvg(size), 12, 12, 3);
    return withPath(svg,
        "M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4");
}

/** Lucide "search". */
export function search(size: number = 14): SVGElement {
    return withPath(withCircle(createSvg(size), 11, 11, 7), "m21 21-4.3-4.3");
}

/** Lucide "trash-2" - remove one row from the History page. */
export function trash(size: number = 15): SVGElement {
    return withPath(createSvg(size), "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6");
}

/** Lucide "chevron-down" - the language field's disclosure. */
export function chevronDown(size: number = 14): SVGElement {
    return withPath(createSvg(size), "m6 9 6 6 6-6");
}

/** Lucide "chevron-left" - step back through this session's lookups. */
export function chevronLeft(size: number = 14): SVGElement {
    return withPath(createSvg(size), "m15 18-6-6 6-6");
}

/** Lucide "chevron-right" - step forward through this session's lookups. */
export function chevronRight(size: number = 14): SVGElement {
    return withPath(createSvg(size), "m9 18 6-6-6-6");
}

/**
 * The Swedish flag, 16x11, marking the card's source language.
 *
 * Drawn rather than fetched. The dictionary serves its own flag images inside the
 * response, but this one belongs to the header, which must render before any
 * response arrives - and must not depend on the provider still serving it.
 */
export function swedishFlag(): SVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "11");
    svg.setAttribute("viewBox", "0 0 16 11");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const rect = (x: number, y: number, width: number, height: number, fill: string) => {
        const node = document.createElementNS(SVG_NS, "rect");
        node.setAttribute("x", x.toString());
        node.setAttribute("y", y.toString());
        node.setAttribute("width", width.toString());
        node.setAttribute("height", height.toString());
        node.setAttribute("fill", fill);
        svg.appendChild(node);
    };

    rect(0, 0, 16, 11, "#006AA7");
    rect(0, 4, 16, 3, "#FECC02");
    rect(5, 0, 3, 11, "#FECC02");

    return svg;
}

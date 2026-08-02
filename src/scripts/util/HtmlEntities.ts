/**
 * Decodes HTML entities without a DOM.
 *
 * Lexin serves non-Latin scripts as numeric character references - a Russian entry
 * arrives as `&#1089;&#1087;&#1086;&#1088;&#1090;`, not `спорт` - so anything that
 * lifts text *out* of the Translation Markup has to decode it. The Translation Card
 * never needed this because it renders the markup as markup and the browser decodes;
 * the History page, its exports and the popup's Recent chips all take the text as
 * text, where an undecoded entity shows through verbatim.
 *
 * Hand-rolled rather than `DOMParser` or an off-screen element because the service
 * worker that owns the history store has neither.
 */

const NAMED_ENTITIES: { [entity: string]: string } = {
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&auml;": "ä",
    "&ouml;": "ö",
    "&aring;": "å",
    "&Auml;": "Ä",
    "&Ouml;": "Ö",
    "&Aring;": "Å"
};

function fromCodePoint(code: number): string {
    // Lone surrogates and out-of-range values throw. A malformed reference is not
    // worth losing the rest of the word over.
    try {
        return String.fromCodePoint(code);
    } catch {
        return "";
    }
}

export function decodeHtmlEntities(value: string): string {
    // Nothing to do for the overwhelming majority of strings, including every one
    // that has already been decoded once - which is what makes this cheap enough to
    // call on every read of the history store.
    if (!value || value.indexOf("&") < 0) {
        return value;
    }

    let decoded = value;
    for (const entity in NAMED_ENTITIES) {
        if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, entity)) {
            decoded = decoded.split(entity).join(NAMED_ENTITIES[entity]);
        }
    }

    decoded = decoded.replace(/&#(\d+);/g, (_match, dec) => fromCodePoint(parseInt(dec, 10)));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => fromCodePoint(parseInt(hex, 16)));

    // Last, so that a double-encoded "&amp;#1089;" decodes to "&#1089;" and stops
    // there rather than being taken for a character reference on this pass.
    return decoded.split("&amp;").join("&");
}

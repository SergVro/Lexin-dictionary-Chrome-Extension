import { decodeHtmlEntities } from "../../src/scripts/util/HtmlEntities.js";

describe("decodeHtmlEntities", () => {

    it("should decode the numeric references Lexin writes non-Latin scripts as", () => {
        // Verified against the live service: a Russian entry for "sport" comes back
        // as lang=ru_RU>&#1089;&#1087;&#1086;&#1088;&#1090;<
        expect(decodeHtmlEntities("&#1089;&#1087;&#1086;&#1088;&#1090;")).toBe("спорт");
        expect(decodeHtmlEntities("&#1074;&#1080;&#1082;&#1090;&#1086;&#1088;&#1080;&#1085;&#1072;"))
            .toBe("викторина");
    });

    it("should decode hexadecimal references", () => {
        expect(decodeHtmlEntities("&#x441;&#x43F;&#x43E;&#x440;&#x442;")).toBe("спорт");
    });

    it("should decode the named entities the Swedish pages use", () => {
        expect(decodeHtmlEntities("Ingen unik tr&auml;ff")).toBe("Ingen unik träff");
        expect(decodeHtmlEntities("&Aring;ke &ouml;ppnar")).toBe("Åke öppnar");
    });

    it("should decode a mixed string in one pass", () => {
        expect(decodeHtmlEntities("l&auml;kare &#8211; &#1074;&#1088;&#1072;&#1095;"))
            .toBe("läkare – врач");
    });

    it("should leave text without entities untouched", () => {
        // The early-out that makes this cheap enough to run on every read of the
        // history store.
        expect(decodeHtmlEntities("спорт")).toBe("спорт");
        expect(decodeHtmlEntities("home, abode")).toBe("home, abode");
        expect(decodeHtmlEntities("")).toBe("");
    });

    it("should be idempotent, so a decoded store can be decoded again", () => {
        const once = decodeHtmlEntities("&#1089;&#1087;&#1086;&#1088;&#1090;");
        expect(decodeHtmlEntities(once)).toBe(once);
    });

    it("should stop after one pass on a double-encoded reference", () => {
        // &amp; is resolved last, so this yields the literal reference rather than
        // silently decoding a level the source did not intend.
        expect(decodeHtmlEntities("&amp;#1089;")).toBe("&#1089;");
    });

    it("should drop a malformed reference rather than the rest of the word", () => {
        expect(decodeHtmlEntities("a&#1114112;b")).toBe("ab");
    });
});

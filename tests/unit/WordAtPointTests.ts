import { wordAtOffset } from "../../src/scripts/content/WordAtPoint.js";

describe("WordAtPoint", () => {

    describe("wordAtOffset", () => {
        it("should name the word the caret sits inside", () => {
            const text = "en bil kör";
            expect(wordAtOffset(text, 4)).toBe("bil");
            expect(wordAtOffset(text, 5)).toBe("bil");
        });

        it("should name the word the caret sits against", () => {
            // A click lands on a boundary as often as not, and both sides of one
            // name the same word to the reader who clicked it.
            const text = "en bil kör";
            expect(wordAtOffset(text, 3)).toBe("bil");
            expect(wordAtOffset(text, 6)).toBe("bil");
        });

        it("should keep Swedish letters whole", () => {
            // The bug this pins: \w is ASCII-only, so the old expression turned
            // björn into bjrn - in a Swedish dictionary, on the words a reader is
            // most likely to need looked up.
            expect(wordAtOffset("en björn sover", 5)).toBe("björn");
            expect(wordAtOffset("ett träd", 6)).toBe("träd");
            expect(wordAtOffset("på ön", 4)).toBe("ön");
            expect(wordAtOffset("räksmörgås", 5)).toBe("räksmörgås");
        });

        it("should keep hyphenated and digit-bearing words whole", () => {
            expect(wordAtOffset("e-post idag", 2)).toBe("e-post");
            expect(wordAtOffset("v2 släpps", 1)).toBe("v2");
        });

        it("should return nothing where there is no word", () => {
            // A caret with whitespace on both sides names nothing. Touching a word on
            // either side is a hit, which is the previous test.
            expect(wordAtOffset("en  bil", 3)).toBe("");
            expect(wordAtOffset("   ", 1)).toBe("");
            expect(wordAtOffset("", 0)).toBe("");
        });

        it("should tolerate an offset outside the text", () => {
            // Nothing guarantees the caret API and the text node agree, and a throw
            // here would take the whole lookup with it.
            expect(wordAtOffset("en bil", 999)).toBe("bil");
            expect(wordAtOffset("en bil", -5)).toBe("en");
        });
    });
});

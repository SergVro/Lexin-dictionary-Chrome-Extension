import TranslationParser from "../../src/scripts/dictionary/TranslationParser.js";

describe("TranslationParser", () => {

    it("should remove every Lexin compound separator from a history word", () => {
        const parser = new TranslationParser();
        const entries = parser.parse("<b>bil|barn|stol</b>:<b>car seat</b>", /<b>(.*?)<\/b>:<b>(.*?)<\/b>/g);

        expect(entries).toHaveLength(1);
        expect(entries[0].word).toBe("bilbarnstol");
        expect(entries[0].translation).toBe("car seat");
    });
});

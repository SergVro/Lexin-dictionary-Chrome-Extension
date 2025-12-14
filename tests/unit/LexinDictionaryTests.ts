import { FakeLoader } from "./util/fakes.js";
import LexinDictionary from "../../src/scripts/Dictionary/LexinDictionary.js";
import TranslationDirection from "../../src/scripts/Dictionary/TranslationDirection.js";
import swe_rus_translation_multi from "./data/swe_rus_translation_multi.html";

describe("LexinDictionary", () => {
    let dictionary: LexinDictionary;
    let loader: FakeLoader;

    beforeEach(() => {
        loader = new FakeLoader();
        dictionary = new LexinDictionary(loader);
    });

    it("should return supported languages", () => {
        const languages = dictionary.getSupportedLanguages();
        expect(languages.length).toBe(19);
    });

    it("should check if language is supported", () => {
        expect(dictionary.isLanguageSupported("swe_swe")).toBe(true);
        expect(dictionary.isLanguageSupported("swe_eng")).toBe(false);
    });

    describe("queryUrl", () => {
        it("should create query URL for bil swe_rus to", () => {
            expect(dictionary.createQueryUrl("bil", "swe_rus", TranslationDirection.to))
                .toBe("http://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,bil");
        });

        it("should create query URL for katt swe_swe from", () => {
            expect(dictionary.createQueryUrl("katt", "swe_swe", TranslationDirection.from))
                .toBe("http://lexin.nada.kth.se/lexin/service?searchinfo=from,swe_swe,katt");
        });
    });

    it("should check if word is found", () => {
        expect(dictionary.isWordFound("test", "test - Ingen träff")).toBe(false);
        expect(dictionary.isWordFound("test", "test - Ingen unik träff")).toBe(false);
    });

    describe("getTranslation", () => {
        it("should get translation normally", async () => {
            loader.data = [swe_rus_translation_multi];
            const translation = await dictionary.getTranslation("författare", "swe_rus", TranslationDirection.to);
            expect(translation.length).toBeGreaterThan(0);
        });

        it("should retry with lowercase if not found", async () => {
            loader.data = ["Författare - Ingen träff", swe_rus_translation_multi];
            const translation = await dictionary.getTranslation("Författare", "swe_rus", TranslationDirection.to);
            expect(loader.urls.length).toBe(2);
            expect(loader.urls[0]).toBe("http://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,F%C3%B6rfattare");
            expect(loader.urls[1]).toBe("http://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,f%C3%B6rfattare");
            expect(translation.length).toBeGreaterThan(0);
        });
    });

    it("should parse translation", () => {
        const history = dictionary.parseTranslation(swe_rus_translation_multi, "swe_rus");

        expect(history.length).toBe(7);
        expect(history[0].word).toBe("författare");
        expect(history[0].translation).toBe("писатель");
        expect(history[1].word).toBe("bestseller");
        expect(history[1].translation).toBe("бестселлер");
        expect(history[2].word).toBe("memoarer");
        expect(history[2].translation).toBe("мемуары");
        expect(history[3].word).toBe("ordbok");
        expect(history[3].translation).toBe("словарь");
        expect(history[4].word).toBe("pjäs");
        expect(history[4].translation).toBe("пьеса");
        expect(history[5].word).toBe("roman");
        expect(history[5].translation).toBe("роман");
        expect(history[6].word).toBe("succé");
        expect(history[6].translation).toBe("успех");
    });
});

import { FakeLoader } from "./util/fakes.js";
import FolketsDictionary from "../../src/scripts/dictionary/FolketsDictionary.js";
import TranslationDirection from "../../src/scripts/dictionary/TranslationDirection.js";
import swe_eng_translation_multi from "./data/swe_eng_translation_multi.html";

describe("FolketsDictionary", () => {
    let dictionary: FolketsDictionary;
    let loader: FakeLoader;

    beforeEach(() => {
        loader = new FakeLoader();
        dictionary = new FolketsDictionary(loader);
    });

    it("should return supported languages", () => {
        const languages = dictionary.getSupportedLanguages();
        expect(languages.length).toBe(1);
    });

    it("should check if language is supported", () => {
        expect(dictionary.isLanguageSupported("swe_swe")).toBe(false);
        expect(dictionary.isLanguageSupported("swe_eng")).toBe(true);
    });

    describe("queryUrl", () => {
        it("should create query URL for bil swe_eng to", () => {
            expect(dictionary.createQueryUrl("bil", "swe_eng", TranslationDirection.to))
                .toBe("http://folkets-lexikon.csc.kth.se/folkets/service?lang=sv&interface=en&word=bil");
        });

        it("should create query URL for katt swe_eng from", () => {
            expect(dictionary.createQueryUrl("katt", "swe_eng", TranslationDirection.from))
                .toBe("http://folkets-lexikon.csc.kth.se/folkets/service?lang=en&interface=en&word=katt");
        });
    });

    it("should check if word is found", () => {
        expect(dictionary.isWordFound("test", "test - No hit")).toBe(false);
    });

    it("should get translation", async () => {
        loader.data = [swe_eng_translation_multi];
        const translation = await dictionary.getTranslation("hem", "swe_eng", TranslationDirection.to);
        expect(translation.length).toBeGreaterThan(0);
    });

    it("should parse translation", () => {
        const history = dictionary.parseTranslation(swe_eng_translation_multi, "swe_eng");

        expect(history.length).toBe(3);
        expect(history[0].word).toBe("hem");
        expect(history[0].translation).toBe("home");
        expect(history[1].word).toBe("hem");
        expect(history[1].translation).toBe("home");
        expect(history[2].word).toBe("hem");
        expect(history[2].translation).toBe("house");
    });
});

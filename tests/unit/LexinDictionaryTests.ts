import { FakeLoader } from "./util/fakes.js";
import LexinDictionary from "../../src/scripts/dictionary/LexinDictionary.js";
import TranslationDirection from "../../src/scripts/dictionary/TranslationDirection.js";
import swe_rus_translation_multi from "./data/swe_rus_translation_multi.html";
import swe_ukr_translation_multi from "./data/swe_ukr_translation_multi.html";
import swe_ara_translation_multi from "./data/swe_ara_translation_multi.html";
import swe_amh_translation_multi from "./data/swe_amh_translation_multi.html";
import swe_swe_definition_multi from "./data/swe_swe_definition_multi.html";

describe("LexinDictionary", () => {
    let dictionary: LexinDictionary;
    let loader: FakeLoader;

    beforeEach(() => {
        loader = new FakeLoader();
        dictionary = new LexinDictionary(loader);
    });

    it("should return supported languages", () => {
        const languages = dictionary.getSupportedLanguages();
        expect(languages.length).toBe(20);
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

    it("should decode the numeric references Lexin writes Cyrillic as", () => {
        // The stored fixtures happen to carry raw UTF-8, but the live service returns
        // lang=ru_RU>&#1089;&#1087;&#1086;&#1088;&#1090;< - which used to be stored,
        // exported and shown verbatim.
        const encoded = "<p><div><b><span lang=sv_SE>sport</span></b> [sport] subst.</div>" +
            "<div><b><span lang=ru_RU>&#1089;&#1087;&#1086;&#1088;&#1090;</span></b>&nbsp;&nbsp;</div></p>";

        const history = dictionary.parseTranslation(encoded, "swe_rus");

        expect(history.length).toBe(1);
        expect(history[0].word).toBe("sport");
        expect(history[0].translation).toBe("спорт");
    });

    it("should parse Ukrainian translation", () => {
        const history = dictionary.parseTranslation(swe_ukr_translation_multi, "swe_ukr");

        expect(history.length).toBe(4);
        expect(history[0].word).toBe("författare");
        expect(history[0].translation).toBe("письменник");
        expect(history[1].word).toBe("ordbok");
        expect(history[1].translation).toBe("словник");
        expect(history[2].word).toBe("roman");
        expect(history[2].translation).toBe("роман");
        expect(history[3].word).toBe("succé");
        expect(history[3].translation).toBe("успіх");
    });

    // Lexin serves Arabic, Persian and Somali from a different template: the headword
    // is bold text rather than a lang=sv_SE span, and the translations are a run of
    // spans inside one <b> with no trailing &nbsp;&nbsp;. Nothing matched, so every
    // lookup in those languages recorded no history at all.
    it("should parse Arabic translation", () => {
        const history = dictionary.parseTranslation(swe_ara_translation_multi, "swe_ara");

        expect(history.length).toBe(2);
        expect(history[0].word).toBe("ordbok");
        expect(history[0].translation).toBe("قاموس، مُعْجَم");
        expect(history[1].word).toBe("bok");
        expect(history[1].translation).toBe("كتاب");
    });

    // Amharic, Pashto and South Kurdish use the common template but write the
    // translation span as dir=rtl lang=am_ET, which the old pattern did not allow for.
    it("should parse Amharic translation", () => {
        const history = dictionary.parseTranslation(swe_amh_translation_multi, "swe_amh");

        expect(history.length).toBe(5);
        expect(history[0].word).toBe("författare");
        expect(history[0].translation).toBe("ደራሲ");
        expect(history[1].word).toBe("ordbok");
        expect(history[1].translation).toBe("መዝገበ ቃላት");
        expect(history[4].word).toBe("succé");
        expect(history[4].translation).toBe("ስኬት");
    });

    it("should skip entries Lexin leaves untranslated", () => {
        // A bold span with nothing in it - swe_ukr has a few - is not history.
        const empty = "<p><div><b><span lang=sv_SE>arbete</span></b> subst.&nbsp;&nbsp;</div>" +
            "<div><b><span lang=uk_UA></span></b>&nbsp;&nbsp; </div></p>";

        expect(dictionary.parseTranslation(empty, "swe_ukr")).toEqual([]);
    });

    // swe_swe answers with a definition where the others answer with a translation,
    // so it is read with its own pattern and the definition is what gets stored.
    describe("monolingual Swedish", () => {
        it("should record definitions as history", () => {
            // Two homographs of "under", so the same word twice - the first behind a
            // sense number, the second not.
            const history = dictionary.parseTranslation(swe_swe_definition_multi, "swe_swe");

            expect(history.length).toBe(2);
            expect(history[0].word).toBe("under");
            expect(history[0].translation).toBe("i läge nedanför");
            expect(history[1].word).toBe("under");
            expect(history[1].translation).toBe("märklig händelse, mirakel, underverk");
        });

        it("should skip an entry that stops at the headword", () => {
            const stub = "<p><div><b>mycket</b> <b>(2)</b>  [<span lang=sv_S'e>²myk:e(t)</span>] adv.&nbsp;&nbsp;</div></p>";

            expect(dictionary.parseTranslation(stub, "swe_swe")).toEqual([]);
        });

        it("should not read a bilingual entry with the monolingual pattern", () => {
            // The Swedish definition sits where the pattern looks, so swe_rus must
            // not be routed to it - the Russian translation is what belongs there.
            const history = dictionary.parseTranslation(swe_rus_translation_multi, "swe_rus");

            expect(history[0].translation).toBe("писатель");
        });
    });

    it("should preserve Swedish characters (å, ä, ö) in translation HTML", async () => {
        // Test data with Swedish characters similar to the bug report
        const translationWithSwedishChars = "<html><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"></head><body><p><div><b><span lang=sv_SE>bil</span></b> [bi:l] <a href=\"#\"><small>LYSSNA</small></a> subst.</div><div>〈bilen, bilar, bilarna〉</div><div>ett fordon för ett litet antal personer</div><div>BILD SVENSKA, BILD SVENSKA</div><div><p><span lang=sv_SE>Sammansättningar: </span></p><ul><li><span lang=sv_SE>bil|buren</span></li><li><span lang=sv_SE>bil|fri</span></li><li><span lang=sv_SE>bil|körning</span></li><li><span lang=sv_SE>bil|skatt</span></li><li><span lang=sv_SE>bil|trafik</span></li><li><span lang=sv_SE>last|bil</span></li><li><span lang=sv_SE>person|bil</span></li></ul></div><div><p><span lang=sv_SE>Exempel: </span></p><ul><li><span lang=sv_SE>hon tycker det är roligt att köra bil</span></li><li><span lang=sv_SE>han åkte bil till jobbet</span></li></ul></div></p></body></html>";
        
        loader.data = [translationWithSwedishChars];
        const translation = await dictionary.getTranslation("bil", "swe_swe", TranslationDirection.to);
        
        // Verify Swedish characters are preserved
        expect(translation).toContain("för");
        expect(translation).toContain("körning");
        expect(translation).toContain("kör");
        expect(translation).toContain("åkte");
        expect(translation).toContain("Sammansättningar");
        expect(translation).toContain("är");
        
        // Verify no replacement characters () are present - check that Swedish chars are actual chars, not replacement
        // If encoding is broken, we'd see replacement chars instead of proper Swedish letters
        const hasReplacementChar = translation.includes("\uFFFD");
        expect(hasReplacementChar).toBe(false);
    });
});

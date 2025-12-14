import DictionaryFactory from "../../src/scripts/Dictionary/DictionaryFactory.js";
import TranslationParser from "../../src/scripts/Dictionary/TranslationParser.js";
import TranslationManager from "../../src/scripts/Dictionary/TranslationManager.js";
import TranslationDirection from "../../src/scripts/Dictionary/TranslationDirection.js";
import HistoryManager from "../../src/scripts/HistoryManager.js";
import LanguageManager from "../../src/scripts/LanguageManager.js";
import { FakeDictionary } from "./util/fakes.js";

describe("TranslationManager", () => {
    let translationManager: TranslationManager;
    let fakeDictionary: FakeDictionary;
    let languageManager: LanguageManager;
    let historyManager: HistoryManager;

    beforeEach(() => {
        fakeDictionary = new FakeDictionary();

        const translationParser = new TranslationParser();
        const dictionaryFactory = new DictionaryFactory([fakeDictionary]);

        languageManager = new LanguageManager(localStorage, dictionaryFactory);
        historyManager = new HistoryManager(translationParser, localStorage);
        translationManager = new TranslationManager(historyManager, dictionaryFactory, languageManager);

        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe("getTranslation", () => {
        it("should get word translation", async () => {
            const translation = await translationManager.getTranslation("aword", TranslationDirection.to);
            expect(translation).toBe("atranslation");
        });

        it("should add word to history", async () => {
            await translationManager.getTranslation("aword", TranslationDirection.to);
            const history = historyManager.getHistory(languageManager.currentLanguage);
            expect(history.length).toBe(1);
            expect(history[0].word).toBe("aword");
            expect(history[0].translation).toBe("atranslation");
        });

        it("should skip adding word to history when skipHistory is true", async () => {
            await translationManager.getTranslation("aword", TranslationDirection.to, undefined, true);
            const history = historyManager.getHistory(languageManager.currentLanguage);
            expect(history.length).toBe(0);
        });

        it("should reject for empty word", async () => {
            await expect(translationManager.getTranslation(" ", TranslationDirection.to))
                .rejects.toBe("word is required");
        });
    });
});

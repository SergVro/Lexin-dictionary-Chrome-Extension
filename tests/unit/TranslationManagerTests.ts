import DictionaryFactory from "../../src/scripts/dictionary/DictionaryFactory.js";
import TranslationParser from "../../src/scripts/dictionary/TranslationParser.js";
import TranslationManager from "../../src/scripts/dictionary/TranslationManager.js";
import TranslationDirection from "../../src/scripts/dictionary/TranslationDirection.js";
import HistoryManager from "../../src/scripts/history/HistoryManager.js";
import LanguageManager from "../../src/scripts/common/LanguageManager.js";
import { FakeDictionary, FakeAsyncStorage, FakeAsyncSettingsStorage } from "./util/fakes.js";

describe("TranslationManager", () => {
    let translationManager: TranslationManager;
    let fakeDictionary: FakeDictionary;
    let languageManager: LanguageManager;
    let historyManager: HistoryManager;
    let fakeStorage: FakeAsyncStorage;
    let fakeSettingsStorage: FakeAsyncSettingsStorage;

    beforeEach(async () => {
        fakeDictionary = new FakeDictionary();
        fakeStorage = new FakeAsyncStorage();
        fakeSettingsStorage = new FakeAsyncSettingsStorage();

        const translationParser = new TranslationParser();
        const dictionaryFactory = new DictionaryFactory([fakeDictionary]);

        languageManager = new LanguageManager(fakeSettingsStorage, dictionaryFactory);
        await languageManager.waitForInitialization();
        historyManager = new HistoryManager(translationParser, fakeStorage);
        translationManager = new TranslationManager(historyManager, dictionaryFactory, languageManager);
    });

    describe("getTranslation", () => {
        it("should get word translation", async () => {
            const translation = await translationManager.getTranslation("aword", TranslationDirection.to);
            expect(translation).toBe("atranslation");
        });

        it("should add word to history", async () => {
            await translationManager.getTranslation("aword", TranslationDirection.to);
            const currentLang = await languageManager.getCurrentLanguage();
            const history = await historyManager.getHistory(currentLang);
            expect(history.length).toBe(1);
            expect(history[0].word).toBe("aword");
            expect(history[0].translation).toBe("atranslation");
        });

        it("should skip adding word to history when skipHistory is true", async () => {
            await translationManager.getTranslation("aword", TranslationDirection.to, undefined, true);
            const currentLang = await languageManager.getCurrentLanguage();
            const history = await historyManager.getHistory(currentLang);
            expect(history.length).toBe(0);
        });

        it("should reject for empty word", async () => {
            await expect(translationManager.getTranslation(" ", TranslationDirection.to))
                .rejects.toBe("word is required");
        });
    });
});

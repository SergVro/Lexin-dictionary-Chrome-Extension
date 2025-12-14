import DictionaryFactory from "../../src/scripts/dictionary/DictionaryFactory.js";
import HistoryManager from "../../src/scripts/history/HistoryManager.js";
import TranslationParser from "../../src/scripts/dictionary/TranslationParser.js";
import { FakeAsyncStorage } from "./util/fakes.js";

describe("HistoryManager", () => {
    let historyManager: HistoryManager;
    let fakeStorage: FakeAsyncStorage;

    beforeEach(() => {
        fakeStorage = new FakeAsyncStorage();
        const translationParser = new TranslationParser();
        historyManager = new HistoryManager(translationParser, fakeStorage);
    });

    describe("getHistory", () => {
        it("should return empty history", async () => {
            const testHistory = await historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(0);
        });

        it("should return history with item", async () => {
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            const testHistory = await historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
        });

        it("should compress full duplicates", async () => {
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            const testHistory = await historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
        });

        it("should compress duplicate words", async () => {
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation2", added: new Date().getTime()}
            ]);

            const testHistory = await historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
            expect(testHistory[0].translation).toBe("test_translation; test_translation2");
        });

        it("should compress duplicate translations", async () => {
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation; test_translation2", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation2; test_translation3", added: new Date().getTime()}
            ]);

            const testHistory = await historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
            expect(testHistory[0].translation).toBe("test_translation; test_translation2; test_translation3");
        });

        it("should sort by date", async () => {
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date(2015, 9, 1).getTime()},
                {word: "test_word2", translation: "test_translation2", added: new Date(2015, 9, 5).getTime()},
                {word: "test_word3", translation: "test_translation3", added: new Date(2015, 9, 3).getTime()}
            ]);

            const testHistory = await historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(3);
            expect(testHistory[0].word).toBe("test_word2");
            expect(testHistory[1].word).toBe("test_word3");
            expect(testHistory[2].word).toBe("test_word");
        });
    });

    describe("clearHistory", () => {
        it("should clear history for specific language", async () => {
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
            ]);
            await historyManager.addToHistory("swe_bar", [
                {word: "test_word2", translation: "test_translation2", added: new Date().getTime()}
            ]);

            await historyManager.clearHistory("swe_foo");

            const history_swe_foo = await historyManager.getHistory("swe_foo");
            const history_swe_bar = await historyManager.getHistory("swe_bar");

            expect(history_swe_foo.length).toBe(0);
            expect(history_swe_bar.length).toBe(1);
        });
    });

    it("should compress too long history", async () => {
        const addCount = 15;
        historyManager.maxHistory = 10;
        const addedValue = new Date().getTime();
        for (let i = 0; i < addCount; i++) {
            const item = {
                word: `testWord ${i}`,
                translation: `test translation ${i}`,
                added: addedValue + i // to ensure each next item gets greater value then previous
            };
            await historyManager.addToHistory("swe_foo", [item]);
        }
        const history = await historyManager.getHistory("swe_foo");
        expect(history.length).toBeLessThan(addCount);
        for (let j = 0; j < history.length; j++) {
            expect(history[j].word).toBe(`testWord ${addCount - 1 - j}`);
        }
    });
});

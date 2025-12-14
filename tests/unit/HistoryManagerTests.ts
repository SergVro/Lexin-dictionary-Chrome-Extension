import DictionaryFactory from "../../src/scripts/Dictionary/DictionaryFactory.js";
import HistoryManager from "../../src/scripts/HistoryManager.js";
import TranslationParser from "../../src/scripts/Dictionary/TranslationParser.js";

describe("HistoryManager", () => {
    let historyManager: HistoryManager;

    beforeEach(() => {
        localStorage.clear();
        const translationParser = new TranslationParser();
        historyManager = new HistoryManager(translationParser, localStorage);
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe("getHistory", () => {
        it("should return empty history", () => {
            const testHistory = historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(0);
        });

        it("should return history with item", () => {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            const testHistory = historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
        });

        it("should compress full duplicates", () => {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            const testHistory = historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
        });

        it("should compress duplicate words", () => {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation2", added: new Date().getTime()}
            ]);

            const testHistory = historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
            expect(testHistory[0].translation).toBe("test_translation; test_translation2");
        });

        it("should compress duplicate translations", () => {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation; test_translation2", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation2; test_translation3", added: new Date().getTime()}
            ]);

            const testHistory = historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(1);
            expect(testHistory[0].word).toBe("test_word");
            expect(testHistory[0].translation).toBe("test_translation; test_translation2; test_translation3");
        });

        it("should sort by date", () => {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date(2015, 9, 1).getTime()},
                {word: "test_word2", translation: "test_translation2", added: new Date(2015, 9, 5).getTime()},
                {word: "test_word3", translation: "test_translation3", added: new Date(2015, 9, 3).getTime()}
            ]);

            const testHistory = historyManager.getHistory("swe_foo");
            expect(testHistory.length).toBe(3);
            expect(testHistory[0].word).toBe("test_word2");
            expect(testHistory[1].word).toBe("test_word3");
            expect(testHistory[2].word).toBe("test_word");
        });
    });

    describe("clearHistory", () => {
        it("should clear history for specific language", () => {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
            ]);
            historyManager.addToHistory("swe_bar", [
                {word: "test_word2", translation: "test_translation2", added: new Date().getTime()}
            ]);

            historyManager.clearHistory("swe_foo");

            const history_swe_foo = historyManager.getHistory("swe_foo");
            const history_swe_bar = historyManager.getHistory("swe_bar");

            expect(history_swe_foo.length).toBe(0);
            expect(history_swe_bar.length).toBe(1);
        });
    });

    it("should compress too long history", () => {
        const addCount = 15;
        historyManager.maxHistory = 10;
        const addedValue = new Date().getTime();
        for (let i = 0; i < addCount; i++) {
            const item = {
                word: `testWord ${i}`,
                translation: `test translation ${i}`,
                added: addedValue + i // to ensure each next item gets greater value then previous
            };
            historyManager.addToHistory("swe_foo", [item]);
        }
        const history = historyManager.getHistory("swe_foo");
        expect(history.length).toBeLessThan(addCount);
        for (let j = 0; j < history.length; j++) {
            expect(history[j].word).toBe(`testWord ${addCount - 1 - j}`);
        }
    });
});

import DictionaryFactory from "../../src/scripts/dictionary/DictionaryFactory.js";
import HistoryManager from "../../src/scripts/history/HistoryManager.js";
import TranslationParser from "../../src/scripts/dictionary/TranslationParser.js";
import { FakeAsyncStorage } from "./util/fakes.js";

class FailOnceAsyncStorage extends FakeAsyncStorage {
    private shouldFailSet = true;

    async setItem(key: string, value: string): Promise<void> {
        if (this.shouldFailSet) {
            this.shouldFailSet = false;
            throw new Error("setItem failed");
        }
        await super.setItem(key, value);
    }
}

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

    describe("entries stored before the parser decoded them", () => {
        it("should decode them on the way out and write the result back", async () => {
            await fakeStorage.setItem("historyswe_rus", JSON.stringify([
                {word: "sport", translation: "&#1089;&#1087;&#1086;&#1088;&#1090;", added: 1}
            ]));

            const history = await historyManager.getHistory("swe_rus");

            expect(history[0].translation).toBe("спорт");
            // Written back, so the store is clean for everything that reads it next.
            expect(await fakeStorage.getItem("historyswe_rus")).toContain("спорт");
        });

        it("should let an encoded entry merge with its decoded twin", async () => {
            // Otherwise the same word sits in the list twice, once per spelling, and
            // exports carry both.
            await fakeStorage.setItem("historyswe_rus", JSON.stringify([
                {word: "sport", translation: "&#1089;&#1087;&#1086;&#1088;&#1090;", added: 1},
                {word: "sport", translation: "спорт", added: 2}
            ]));

            const history = await historyManager.getHistory("swe_rus");

            expect(history.length).toBe(1);
            expect(history[0].translation).toBe("спорт");
        });
    });

    describe("getDirections", () => {
        it("should list only directions that have history", async () => {
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);
            await historyManager.addToHistory("swe_bar", [
                {word: "test_word2", translation: "test_translation2", added: new Date().getTime()}
            ]);
            // Settings share the store, and must not be mistaken for a direction.
            await fakeStorage.setItem("defaultLanguage", "swe_foo");
            await fakeStorage.setItem("knownLanguages", "swe_foo,swe_bar");

            const directions = await historyManager.getDirections();

            expect(directions.sort()).toEqual(["swe_bar", "swe_foo"]);
        });

        it("should return nothing for a reader who has looked nothing up", async () => {
            expect(await historyManager.getDirections()).toEqual([]);
        });

        it("should not return a direction whose store is empty", async () => {
            // Opening the Action Popup refreshes its Recent row through getHistory, which
            // writes [] for a language nothing was ever looked up in; deleting the last
            // row leaves the same. Either would otherwise become a permanent empty tab.
            await fakeStorage.setItem("historyswe_foo", "[]");
            expect(await historyManager.getDirections()).toEqual([]);
        });

        it("should still return a direction once something is looked up in it", async () => {
            await fakeStorage.setItem("historyswe_foo", "[]");
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            expect(await historyManager.getDirections()).toEqual(["swe_foo"]);
        });

        it("should not return a direction whose store cannot be read", async () => {
            // The History page could not show it either, and one broken key must not
            // take the rest of the tabs with it.
            await fakeStorage.setItem("historyswe_foo", "not json");
            await historyManager.addToHistory("swe_bar", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            expect(await historyManager.getDirections()).toEqual(["swe_bar"]);
        });

        it("should not return the bare storage key as a direction", async () => {
            // A stray "history" key with no direction appended would otherwise become
            // a tab pointing at nothing.
            await fakeStorage.setItem("history", "[]");
            expect(await historyManager.getDirections()).toEqual([]);
        });
    });

    describe("removeItem", () => {
        it("should remove the matching entry and leave the rest", async () => {
            const added = new Date().getTime();
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: added},
                {word: "test_word2", translation: "test_translation2", added: added + 1}
            ]);

            await historyManager.removeItem("swe_foo", "test_word", added);

            const history = await historyManager.getHistory("swe_foo");
            expect(history.length).toBe(1);
            expect(history[0].word).toBe("test_word2");
        });

        it("should match on the timestamp as well as the word", async () => {
            // _removeDuplicates merges same-word entries, so the word alone does not
            // identify a row - deleting on it would take the wrong one.
            const added = new Date().getTime();
            await historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "one", added: added}
            ]);

            await historyManager.removeItem("swe_foo", "test_word", added + 1000);

            expect((await historyManager.getHistory("swe_foo")).length).toBe(1);
        });

        it("should do nothing for a direction with no history", async () => {
            await historyManager.removeItem("swe_foo", "test_word", 1);
            expect((await historyManager.getHistory("swe_foo")).length).toBe(0);
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

    describe("concurrent operations", () => {
        it("should preserve two additions to the same language direction", async () => {
            const first = {word: "first", translation: "one", added: 1};
            const second = {word: "second", translation: "two", added: 2};

            await Promise.all([
                historyManager.addToHistory("swe_foo", [first]),
                historyManager.addToHistory("swe_foo", [second])
            ]);

            const history = await historyManager.getHistory("swe_foo");
            expect(history.map((item) => item.word).sort()).toEqual(["first", "second"]);
        });

        it("should let a history read observe an addition started before it", async () => {
            const item = {word: "test_word", translation: "test_translation", added: 1};

            const [, history] = await Promise.all([
                historyManager.addToHistory("swe_foo", [item]),
                historyManager.getHistory("swe_foo")
            ]);

            expect(history).toEqual([item]);
        });

        it("should not lose an addition when a later removal overlaps it", async () => {
            const removed = {word: "removed", translation: "old", added: 1};
            const retained = {word: "retained", translation: "new", added: 2};
            await historyManager.addToHistory("swe_foo", [removed]);

            await Promise.all([
                historyManager.addToHistory("swe_foo", [retained]),
                historyManager.removeItem("swe_foo", removed.word, removed.added)
            ]);

            expect(await historyManager.getHistory("swe_foo")).toEqual([retained]);
        });

        it("should not let an earlier addition restore cleared history", async () => {
            const original = {word: "original", translation: "old", added: 1};
            const added = {word: "added", translation: "new", added: 2};
            await historyManager.addToHistory("swe_foo", [original]);

            await Promise.all([
                historyManager.addToHistory("swe_foo", [added]),
                historyManager.clearHistory("swe_foo")
            ]);

            expect(await historyManager.getHistory("swe_foo")).toEqual([]);
        });

        it("should continue processing after a storage operation fails", async () => {
            const failingStorage = new FailOnceAsyncStorage();
            const manager = new HistoryManager(new TranslationParser(), failingStorage);
            const failed = {word: "failed", translation: "one", added: 1};
            const retained = {word: "retained", translation: "two", added: 2};

            await expect(manager.addToHistory("swe_foo", [failed])).rejects.toThrow("setItem failed");
            await manager.addToHistory("swe_foo", [retained]);

            expect(await manager.getHistory("swe_foo")).toEqual([retained]);
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

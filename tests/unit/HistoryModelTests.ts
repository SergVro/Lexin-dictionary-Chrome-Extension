import HistoryModel, { ALL_DIRECTIONS } from "../../src/scripts/history/HistoryModel.js";
import DictionaryFactory from "../../src/scripts/dictionary/DictionaryFactory.js";
import LanguageManager from "../../src/scripts/common/LanguageManager.js";
import { TestMessageService, FakeAsyncSettingsStorage } from "./util/fakes.js";
import { IAsyncSettingsStorage } from "../../src/scripts/common/Interfaces.js";

describe("HistoryModel", () => {
    let mockMessageService: TestMessageService;
    let mockSettingsStorage: IAsyncSettingsStorage;
    let dictionaryFactory: DictionaryFactory;
    let languageManager: LanguageManager;
    let historyModel: HistoryModel;

    beforeEach(async () => {
        mockMessageService = new TestMessageService();
        mockSettingsStorage = new FakeAsyncSettingsStorage();
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
        await languageManager.waitForInitialization();
        historyModel = new HistoryModel(mockMessageService, languageManager);
    });

    it("should report the reader's own Language Direction, used to pick the opening tab", async () => {
        expect(await historyModel.getLanguage()).toBe("swe_swe");
    });

    describe("loadDirections", () => {
        it("should report the directions that have history", async () => {
            mockMessageService.directions = ["swe_eng", "swe_ara"];
            expect(await historyModel.loadDirections()).toEqual(["swe_eng", "swe_ara"]);
        });
    });

    describe("loadHistory", () => {
        it("should tag every row with the direction it came from", async () => {
            // The All tab has to be able to name a row's language, and a per-row
            // delete has to know which store to write back to.
            mockMessageService.history = {
                swe_eng: [{ word: "hem", translation: "home", added: 2 }]
            };

            const rows = await historyModel.loadHistory("swe_eng");

            expect(rows).toEqual([{ word: "hem", translation: "home", added: 2, langDirection: "swe_eng" }]);
        });

        it("should merge every direction newest-first for the All tab", async () => {
            mockMessageService.history = {
                swe_eng: [{ word: "hem", translation: "home", added: 3 }],
                swe_ara: [
                    { word: "jobb", translation: "عمل", added: 5 },
                    { word: "skola", translation: "مدرسة", added: 1 }
                ]
            };

            const rows = await historyModel.loadHistory(ALL_DIRECTIONS, ["swe_eng", "swe_ara"]);

            expect(rows.map((row) => row.word)).toEqual(["jobb", "hem", "skola"]);
            expect(rows.map((row) => row.langDirection)).toEqual(["swe_ara", "swe_eng", "swe_ara"]);
        });

        it("should look the directions up itself when not given them", async () => {
            mockMessageService.directions = ["swe_eng"];
            mockMessageService.history = {
                swe_eng: [{ word: "hem", translation: "home", added: 1 }]
            };

            const rows = await historyModel.loadHistory(ALL_DIRECTIONS);

            expect(rows.length).toBe(1);
        });
    });

    describe("clearing and removing", () => {
        it("should clear one direction", async () => {
            historyModel.clearHistory("swe_eng");
            expect(mockMessageService.clearHistoryCalls).toBe(1);
        });

        it("should clear every direction for the All tab", async () => {
            await historyModel.clearAll(["swe_eng", "swe_ara", "swe_fin"]);
            expect(mockMessageService.clearHistoryCalls).toBe(3);
        });

        it("should remove a single row from its own direction", async () => {
            mockMessageService.history = {
                swe_eng: [
                    { word: "hem", translation: "home", added: 1 },
                    { word: "jobb", translation: "job", added: 2 }
                ]
            };

            await historyModel.removeItem(
                { word: "hem", translation: "home", added: 1, langDirection: "swe_eng" });

            expect(mockMessageService.history["swe_eng"].map((item) => item.word)).toEqual(["jobb"]);
        });
    });
});

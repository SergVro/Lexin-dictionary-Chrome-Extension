import HistoryModel from "../../src/scripts/HistoryModel.js";
import DictionaryFactory from "../../src/scripts/Dictionary/DictionaryFactory.js";
import LanguageManager from "../../src/scripts/LanguageManager.js";
import { TestMessageService } from "./util/fakes.js";
import { ISettingsStorage } from "../../src/scripts/Interfaces.js";

describe("HistoryModel", () => {
    let mockMessageService: TestMessageService;
    let mockSettingsStorage: ISettingsStorage;
    let dictionaryFactory: DictionaryFactory;
    let languageManager: LanguageManager;
    let historyModel: HistoryModel;

    beforeEach(() => {
        mockMessageService = new TestMessageService();
        mockSettingsStorage = {};
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
        historyModel = new HistoryModel(mockMessageService, languageManager, mockSettingsStorage);
    });

    it("should have default data", () => {
        expect(historyModel.language).toBe("swe_swe");
        expect(historyModel.showDate).toBe(false);
    });

    describe("setters", () => {
        it("should set language", () => {
            const testLanguage = "swe_eng";
            let onChangeCalled = false;
            
            historyModel.onChange = (model) => {
                expect(model.language).toBe(testLanguage);
                onChangeCalled = true;
            };
            historyModel.language = testLanguage;

            expect(historyModel.language).toBe(testLanguage);
            expect(onChangeCalled).toBe(true);
        });

        it("should set show date", () => {
            let onChangeCalled = false;
            
            historyModel.onChange = (model) => {
                expect(model.showDate).toBe(true);
                onChangeCalled = true;
            };
            historyModel.showDate = true;

            expect(historyModel.showDate).toBe(true);
            expect(mockSettingsStorage["showDate"]).toBe(true);
            expect(onChangeCalled).toBe(true);
        });
    });

    describe("methods", () => {
        it("should load languages", () => {
            const languages = historyModel.loadLanguages();
            expect(languages.length).toBe(19);
        });

        it("should load history", () => {
            historyModel.loadHistory("swe_eng");
            expect(mockMessageService.loadHistoryCalls).toBe(1);
        });

        it("should clear history", () => {
            historyModel.clearHistory("swe_eng");
            expect(mockMessageService.clearHistoryCalls).toBe(1);
        });
    });
});

import HistoryModel from "../../src/scripts/history/HistoryModel.js";
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
        historyModel = new HistoryModel(mockMessageService, languageManager, mockSettingsStorage);
    });

    it("should have default data", async () => {
        expect(await historyModel.getLanguage()).toBe("swe_swe");
        expect(await historyModel.getShowDate()).toBe(false);
    });

    describe("setters", () => {
        it("should set language", async () => {
            const testLanguage = "swe_eng";
            let onChangeCalled = false;
            
            historyModel.onChange = (model) => {
                expect(model.language).toBe(testLanguage);
                onChangeCalled = true;
            };
            await historyModel.setLanguage(testLanguage);

            expect(await historyModel.getLanguage()).toBe(testLanguage);
            expect(onChangeCalled).toBe(true);
        });

        it("should set show date", async () => {
            let onChangeCalled = false;
            
            historyModel.onChange = (model) => {
                expect(model.showDate).toBe(true);
                onChangeCalled = true;
            };
            await historyModel.setShowDate(true);

            expect(await historyModel.getShowDate()).toBe(true);
            const showDateValue = await mockSettingsStorage.getItem("showDate");
            expect(showDateValue).toBe("true");
            expect(onChangeCalled).toBe(true);
        });
    });

    describe("methods", () => {
        it("should load languages", async () => {
            const languages = await historyModel.loadLanguages();
            expect(languages.length).toBe(20);
        });

        it("should wait for the language migration before loading languages", async () => {
            // Simulates the history page being the first extension UI opened during an upgrade:
            // enabledLanguages predates swe_ukr, so LanguageManager's migration must finish
            // adding it before loadLanguages() reads getEnabledLanguages().
            const upgradeStorage = new FakeAsyncSettingsStorage();
            await upgradeStorage.setItem("enabledLanguages", "swe_rus,swe_eng");
            await upgradeStorage.setItem("defaultLanguage", "swe_rus");

            const upgradingLanguageManager = new LanguageManager(upgradeStorage, dictionaryFactory);
            const upgradingHistoryModel = new HistoryModel(mockMessageService, upgradingLanguageManager, upgradeStorage);

            // Deliberately not awaiting waitForInitialization() here - loadLanguages() must do it internally.
            const languages = await upgradingHistoryModel.loadLanguages();

            expect(languages.some((lang) => lang.value === "swe_ukr")).toBe(true);
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

import DictionaryFactory from "../../src/scripts/dictionary/DictionaryFactory.js";
import LanguageManager from "../../src/scripts/common/LanguageManager.js";
import { ILanguage, IAsyncSettingsStorage } from "../../src/scripts/common/Interfaces.js";
import { FakeAsyncSettingsStorage } from "./util/fakes.js";

describe("LanguageManager", () => {
    let mockSettingsStorage: IAsyncSettingsStorage;
    let dictionaryFactory: DictionaryFactory;
    let languageManager: LanguageManager;

    beforeEach(async () => {
        mockSettingsStorage = new FakeAsyncSettingsStorage();
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
        await languageManager.waitForInitialization();
    });

    it("should return all languages", () => {
        const languages = languageManager.getLanguages();
        expect(languages.length).toBe(20);
    });

    describe("enabled languages", () => {
        it("should set enabled languages", async () => {
            const languages = languageManager.getLanguages();
            const enabledLanguages = [
                languageManager.getLanguage("swe_rus"),
                languageManager.getLanguage("swe_eng"),
                languageManager.getLanguage("swe_swe")
            ];

            await languageManager.setEnabledLanguages(enabledLanguages);
            const enabled = await languageManager.getEnabledLanguages();
            expect(enabled).toEqual(expect.arrayContaining(enabledLanguages));
            expect(enabled.length).toBe(enabledLanguages.length);
        });

        it("should set enabled by value", async () => {
            await languageManager.setEnabledByValues(["swe_eng", "swe_rus"]);
            expect(await languageManager.isEnabled("swe_eng")).toBe(true);
            expect(await languageManager.isEnabled("swe_rus")).toBe(true);
        });

        it("should throw error for invalid language value", async () => {
            await expect(languageManager.setEnabledByValues(["swe_eng", "swe_rus", "swe_xxx"])).rejects.toThrow("swe_xxx is not a valid language value");
        });

        it("should get enabled languages", async () => {
            const myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            await languageManager.setCurrentLanguage("swe_eng");
            await languageManager.setEnabledLanguages(myEnabledLanguages);
            expect(await languageManager.getEnabledLanguages()).toEqual(myEnabledLanguages);
        });

        it("should return all languages as default enabled languages", async () => {
            expect(await languageManager.getEnabledLanguages()).toEqual(languageManager.getLanguages());
        });

        it("should check if language is enabled", async () => {
            const myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            await languageManager.setCurrentLanguage("swe_rus");
            await languageManager.setEnabledLanguages(myEnabledLanguages);
            expect(await languageManager.isEnabled("swe_eng")).toBe(true);
            expect(await languageManager.isEnabled("swe_rus")).toBe(true); // current language is always enabled
            expect(await languageManager.isEnabled("swe_swe")).toBe(false);
        });

        it("should set enabled", async () => {
            await languageManager.setEnabledLanguages([]);
            await languageManager.setEnabled("swe_eng");
            expect(await languageManager.isEnabled("swe_eng")).toBe(true);
        });

        it("should set disabled", async () => {
            await languageManager.setEnabledLanguages([]);
            await languageManager.setEnabled("swe_eng");
            await languageManager.setDisabled("swe_eng");
            expect(await languageManager.isEnabled("swe_eng")).toBe(false);
        });

        it("should handle setting already enabled language", async () => {
            const myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            await languageManager.setCurrentLanguage("swe_rus");
            await languageManager.setEnabledLanguages(myEnabledLanguages);
            await languageManager.setEnabled("swe_eng");
            expect(await languageManager.isEnabled("swe_eng")).toBe(true);
        });
    });

    describe("getLanguage", () => {
        it("should get valid language", () => {
            const lang = languageManager.getLanguage("swe_swe");
            expect(lang.text).toBe("Swedish");
        });

        it("should throw error for invalid language", () => {
            expect(() => languageManager.getLanguage("swe_xyz")).toThrow("swe_xyz is not a valid language value");
        });
    });

    describe("currentLanguage", () => {
        it("should set current language", async () => {
            await languageManager.setCurrentLanguage("swe_eng");
            expect(await languageManager.getCurrentLanguage()).toBe("swe_eng");
        });

        it("should throw error for invalid current language", async () => {
            await expect(async () => {
                await languageManager.setCurrentLanguage("swe_aaa");
            }).rejects.toThrow("swe_aaa is not a valid language value");
        });
    });
});

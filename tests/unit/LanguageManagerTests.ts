import DictionaryFactory from "../../src/scripts/Dictionary/DictionaryFactory.js";
import LanguageManager from "../../src/scripts/LanguageManager.js";
import { ILanguage, ISettingsStorage } from "../../src/scripts/Interfaces.js";

describe("LanguageManager", () => {
    let mockSettingsStorage: ISettingsStorage;
    let dictionaryFactory: DictionaryFactory;
    let languageManager: LanguageManager;

    beforeEach(() => {
        mockSettingsStorage = {};
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
    });

    it("should return all languages", () => {
        const languages = languageManager.getLanguages();
        expect(languages.length).toBe(20);
    });

    describe("enabled languages", () => {
        it("should set enabled languages", () => {
            const languages = languageManager.getLanguages();
            const enabledLanguages = [
                languageManager.getLanguage("swe_rus"),
                languageManager.getLanguage("swe_eng"),
                languageManager.getLanguage("swe_swe")
            ];

            languageManager.setEnabledLanguages(enabledLanguages);
            const enabled = languageManager.getEnabledLanguages();
            expect(enabled).toEqual(expect.arrayContaining(enabledLanguages));
            expect(enabled.length).toBe(enabledLanguages.length);
        });

        it("should set enabled by value", () => {
            languageManager.setEnabledByValues(["swe_eng", "swe_rus"]);
            expect(languageManager.isEnabled("swe_eng")).toBe(true);
            expect(languageManager.isEnabled("swe_rus")).toBe(true);
        });

        it("should throw error for invalid language value", () => {
            expect(() => languageManager.setEnabledByValues(["swe_eng", "swe_rus", "swe_xxx"])).toThrow("swe_xxx is not a valid language value");
        });

        it("should get enabled languages", () => {
            const myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            languageManager.currentLanguage = "swe_eng";
            languageManager.setEnabledLanguages(myEnabledLanguages);
            expect(languageManager.getEnabledLanguages()).toEqual(myEnabledLanguages);
        });

        it("should return all languages as default enabled languages", () => {
            expect(languageManager.getEnabledLanguages()).toEqual(languageManager.getLanguages());
        });

        it("should check if language is enabled", () => {
            const myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            languageManager.currentLanguage = "swe_rus";
            languageManager.setEnabledLanguages(myEnabledLanguages);
            expect(languageManager.isEnabled("swe_eng")).toBe(true);
            expect(languageManager.isEnabled("swe_rus")).toBe(true); // current language is always enabled
            expect(languageManager.isEnabled("swe_swe")).toBe(false);
        });

        it("should set enabled", () => {
            languageManager.setEnabledLanguages([]);
            languageManager.setEnabled("swe_eng");
            expect(languageManager.isEnabled("swe_eng")).toBe(true);
        });

        it("should set disabled", () => {
            languageManager.setEnabledLanguages([]);
            languageManager.setEnabled("swe_eng");
            languageManager.setDisabled("swe_eng");
            expect(languageManager.isEnabled("swe_eng")).toBe(false);
        });

        it("should handle setting already enabled language", () => {
            const myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            languageManager.currentLanguage = "swe_rus";
            languageManager.setEnabledLanguages(myEnabledLanguages);
            languageManager.setEnabled("swe_eng");
            expect(languageManager.isEnabled("swe_eng")).toBe(true);
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
        it("should set current language", () => {
            languageManager.currentLanguage = "swe_eng";
            expect(languageManager.currentLanguage).toBe("swe_eng");
        });

        it("should throw error for invalid current language", () => {
            expect(() => {
                languageManager.currentLanguage = "swe_aaa";
            }).toThrow("swe_aaa is not a valid language value");
        });
    });
});

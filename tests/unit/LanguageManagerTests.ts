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
        expect(languages.length).toBe(22);
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

    describe("newly added languages", () => {
        let storage: FakeAsyncSettingsStorage;

        // A user upgrading from a build that predates the knownLanguages key, who had turned most
        // languages off. swe_rus is their default so it is not the current-language special case.
        const createUpgradedManager = async (): Promise<LanguageManager> => {
            const manager = new LanguageManager(storage, dictionaryFactory);
            await manager.waitForInitialization();
            return manager;
        };

        beforeEach(async () => {
            storage = new FakeAsyncSettingsStorage();
            await storage.setItem("enabledLanguages", "swe_rus,swe_eng");
            await storage.setItem("defaultLanguage", "swe_rus");
        });

        it("should enable a language added since the last version, without re-enabling disabled ones", async () => {
            const manager = await createUpgradedManager();

            expect(await manager.isEnabled("swe_ukr")).toBe(true);
            expect(await manager.isEnabled("swe_rus")).toBe(true);
            expect(await manager.isEnabled("swe_eng")).toBe(true);
            // Legacy languages this user had turned off must stay off
            expect(await manager.isEnabled("swe_swe")).toBe(false);
            expect(await manager.isEnabled("swe_tur")).toBe(false);
        });

        it("should record the known languages so the migration only runs once", async () => {
            await createUpgradedManager();

            const known = (await storage.getItem("knownLanguages")).split(",");
            expect(known).toEqual(expect.arrayContaining(["swe_ukr", "swe_swe", "swe_eng"]));
            expect(known.length).toBe(22);
        });

        it("should not duplicate entries when initialized repeatedly", async () => {
            await createUpgradedManager();
            const afterFirst = await storage.getItem("enabledLanguages");

            const manager = await createUpgradedManager();

            expect(await storage.getItem("enabledLanguages")).toBe(afterFirst);
            // No entry twice. Asserted rather than counted: how many languages the
            // migration adds depends on how many have shipped since the legacy list,
            // which grows, and duplication is what this test is actually about.
            const enabled = (await manager.getEnabledLanguages()).map((lang) => lang.value);
            expect(enabled).toEqual(Array.from(new Set(enabled)));
        });

        it("should keep a language disabled after the migration has run", async () => {
            const migrated = await createUpgradedManager();
            await migrated.setDisabled("swe_ukr");

            const manager = await createUpgradedManager();

            expect(await manager.isEnabled("swe_ukr")).toBe(false);
        });

        it("should enable everything on a fresh install", async () => {
            const freshStorage = new FakeAsyncSettingsStorage();
            const manager = new LanguageManager(freshStorage, dictionaryFactory);
            await manager.waitForInitialization();

            expect(await manager.getEnabledLanguages()).toEqual(manager.getLanguages());
            expect((await freshStorage.getItem("knownLanguages")).split(",").length).toBe(22);
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

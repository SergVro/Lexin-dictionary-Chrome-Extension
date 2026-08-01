import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import { ILanguage, IAsyncSettingsStorage } from "./Interfaces.js";

// The languages shipped before the knownLanguages key existed. Used once, to seed that key for
// users upgrading from such a version, so a language they deliberately disabled is not mistaken
// for a newly added one. This is a frozen historical record - never add to it.
/**
 * The settings key holding the reader's Language Direction.
 *
 * Exported because the Translation Card reads it too, through LanguageLabel: the
 * content script needs the current direction for the card header, and constructing a
 * LanguageManager per frame would run its storage-writing initialize() on every page.
 */
export const LANGUAGE_KEY = "defaultLanguage";

const LEGACY_KNOWN_LANGUAGES = [
    "swe_alb", "swe_amh", "swe_ara", "swe_azj", "swe_bos", "swe_hrv", "swe_eng", "swe_fin",
    "swe_gre", "swe_kmr", "swe_pus", "swe_per", "swe_rus", "swe_srp", "swe_srp_cyrillic",
    "swe_som", "swe_sdh", "swe_spa", "swe_swe", "swe_tur"
];

class LanguageManager {
    private languages: ILanguage[];
    private initialized: Promise<void>;

    private settingsStorage: IAsyncSettingsStorage;
    enabledKey: string = "enabledLanguages";
    languageKey: string = LANGUAGE_KEY;
    knownKey: string = "knownLanguages";

    constructor(settingsStorage: IAsyncSettingsStorage, dictionaryFactory: DictionaryFactory) {
        this.settingsStorage = settingsStorage;
        this.languages = dictionaryFactory.getAllSupportedLanguages();

        // Initialize asynchronously - enable all languages on a fresh install, and enable any
        // newly added ones for existing users
        this.initialized = this.initialize();
    }

    private async initialize(): Promise<void> {
        const allValues = this.languages.map((lang) => lang.value);

        const enabledValue = await this.settingsStorage.getItem(this.enabledKey);
        if (enabledValue === null || enabledValue === undefined) {
            // Fresh install - enable everything we support
            await this.setEnabledLanguages(this.languages);
            await this.setKnownLanguages(allValues);
            return;
        }

        // Existing user - enable languages added since the last version they ran, while leaving
        // the ones they disabled themselves alone. Idempotent, so it is safe for the popup,
        // options page, history page and service worker to run it concurrently.
        const knownValue = await this.settingsStorage.getItem(this.knownKey);
        // Upgrading from a version that predates this key - assume it offered the legacy list
        const known = (knownValue === null || knownValue === undefined)
            ? LEGACY_KNOWN_LANGUAGES
            : knownValue.split(",").filter((value) => value.trim() !== "");

        const added = allValues.filter((value) => known.indexOf(value) === -1);
        if (added.length > 0) {
            const enabled = await this.getEnabledLanguages();
            await this.setEnabledLanguages(enabled.concat(added.map((value) => this.getLanguage(value))));
        }
        if (added.length > 0 || knownValue === null || knownValue === undefined) {
            await this.setKnownLanguages(allValues);
        }
    }

    private async setKnownLanguages(languageValues: string[]): Promise<void> {
        await this.settingsStorage.setItem(this.knownKey, languageValues.join(","));
    }

    async waitForInitialization(): Promise<void> {
        await this.initialized;
    }

    getLanguages(): ILanguage[] {
        return this.languages;
    }

    getLanguage(languageValue: string): ILanguage {
        this.checkLanguage(languageValue);
        let language = null;
        this.getLanguages().some((lang) => {
            if (lang.value === languageValue) {
                language = lang;
                return true;
            }
        });
        return language;
    }

    async getEnabledLanguages(): Promise<ILanguage[]> {
        const enabledLanguagesStr = (await this.settingsStorage.getItem(this.enabledKey)) || "";
        // Split and filter out empty strings (which occur when the string is empty or has trailing commas)
        const enabledLanguages = enabledLanguagesStr.split(",").filter(lang => lang.trim() !== "");
        const currentLang = await this.getCurrentLanguage();
        if (enabledLanguages.indexOf(currentLang) === -1) {
            enabledLanguages.push(currentLang);
        }
        const result = this.getLanguages().filter((lang) => enabledLanguages.indexOf(lang.value) >= 0);
        return result;
    }

    async setEnabledLanguages(languages: ILanguage[]): Promise<void> {
        await this.settingsStorage.setItem(this.enabledKey, languages.map((lang) => lang.value).join(","));
    }

    async setEnabledByValues(languages: string[]): Promise<void> {
        languages.forEach((lang) => this.checkLanguage(lang));
        await this.setEnabledLanguages(languages.map((langValue) => this.getLanguage(langValue)));
    }

    async setEnabled(language: string): Promise<void> {
        await this.changeEnabled(language, true);
    }

    async setDisabled(language: string): Promise<void> {
        await this.changeEnabled(language, false);
    }

    private async changeEnabled(language: string, enabled: boolean): Promise<void> {
        const languageEntity = this.getLanguage(language);

        const isCurrentlyEnabled = await this.isEnabled(language);
        if ((enabled && isCurrentlyEnabled) || (!enabled && !isCurrentlyEnabled)) {
            return; // nothing to do here, since already enabled or disabled
        }
        let languages = await this.getEnabledLanguages();
        if (enabled) {
            languages.push(languageEntity);
        } else {
            languages = languages.filter((lang) => lang.value !== languageEntity.value);
        }
        await this.setEnabledLanguages(languages);
    }

    async isEnabled(languageValue: string): Promise<boolean> {
        this.checkLanguage(languageValue);
        const enabledLanguages = await this.getEnabledLanguages();
        return enabledLanguages.some((lang) => lang.value === languageValue);
    }

    async getCurrentLanguage(): Promise<string> {
        let language = await this.settingsStorage.getItem(this.languageKey);
        if (!language) {
            language = "swe_swe";
        }
        return language;
    }

    get currentLanguage(): string {
        // Synchronous getter for backward compatibility - returns default if not yet loaded
        // Use getCurrentLanguage() for async access
        return "swe_swe";
    }

    async setCurrentLanguage(value: string): Promise<void> {
        this.checkLanguage(value);
        await this.settingsStorage.setItem(this.languageKey, value);
    }

    set currentLanguage(value: string) {
        // Synchronous setter for backward compatibility
        this.setCurrentLanguage(value).catch(err => {
            console.error("Error setting current language:", err);
        });
    }

    async getTranslationDirection(): Promise<number> {
        const saved = await this.settingsStorage.getItem("translationDirection");
        // Default to "to" (2) if not set, "from" is 1
        return saved ? parseInt(saved, 10) : 2;
    }

    get translationDirection(): number {
        // Synchronous getter for backward compatibility - returns default
        // Use getTranslationDirection() for async access
        return 2;
    }

    async setTranslationDirection(value: number): Promise<void> {
        await this.settingsStorage.setItem("translationDirection", value.toString());
    }

    set translationDirection(value: number) {
        // Synchronous setter for backward compatibility
        this.setTranslationDirection(value).catch(err => {
            console.error("Error setting translation direction:", err);
        });
    }

    private checkLanguage(value: string) {
        if (!this.getLanguages().some((lang) => lang.value === value)) {
            throw new Error( `${value} is not a valid language value`);
        }
    }
}

export default LanguageManager;

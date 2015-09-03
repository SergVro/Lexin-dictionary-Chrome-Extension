import DictionaryFactory = require("./DictionaryFactory");
import interfaces = require("./Interfaces");
import ILanguage = interfaces.ILanguage;
import ISettingsStorage = interfaces.ISettingsStorage;

class LanguageManager {
    private languages: ILanguage[];

    private settingsStorage: ISettingsStorage;
    enabledKey: string = "enabledLanguages";
    languageKey: string = "defaultLanguage";

    constructor(settingsStorage: ISettingsStorage, dictionaryFactory: DictionaryFactory) {
        this.settingsStorage = settingsStorage;
        this.languages = dictionaryFactory.getAllSupportedLanguages();

        // enable all languages by default
        if (!this.settingsStorage[this.enabledKey]) {
            this.setEnabledLanguages(this.languages);
        }
    }

    getLanguages(): ILanguage[] {
        return this.languages;
    }

    getLanguage(languageValue: string): ILanguage {
        this.checkLanguage(languageValue);
        var language = null;
        this.getLanguages().some((lang) => {
            if (lang.value === languageValue) {
                language = lang;
                return true;
            }
        });
        return language;
    }

    getEnabledLanguages(): ILanguage[] {
        var enabledLanguages = (this.settingsStorage[this.enabledKey] || "").split(",");
        if (enabledLanguages.indexOf(this.currentLanguage) === -1) {
            enabledLanguages.push(this.currentLanguage);
        }
        return this.getLanguages().filter((lang) => enabledLanguages.indexOf(lang.value) >= 0);
    }

    setEnabledLanguages(languages: ILanguage[]): void {
        this.settingsStorage[this.enabledKey] = languages.map((lang) => lang.value).join(",");
    }

    setEnabledByValues(languages: string[]): void {
        languages.forEach((lang) => this.checkLanguage(lang));
        this.setEnabledLanguages(languages.map((langValue) => this.getLanguage(langValue)));
    }

    setEnabled(language: string): void {
        this.changeEnabled(language, true);
    }

    setDisabled(language: string): void {
        this.changeEnabled(language, false);
    }

    private changeEnabled(language: string, enabled: boolean): void {
        var languageEntity = this.getLanguage(language);

        if ((enabled && this.isEnabled(language)) || (!enabled && !this.isEnabled(language))) {
            return; // nothing to do here, since already enabled or disabled
        }
        var languages = this.getEnabledLanguages();
        if (enabled) {
            languages.push(languageEntity);
        } else {
            languages = languages.filter((lang) => lang.value !== languageEntity.value);
        }
        this.setEnabledLanguages(languages);
    }

    isEnabled(languageValue: string) {
        this.checkLanguage(languageValue);
        return this.getEnabledLanguages().some((lang) => lang.value === languageValue);
    }

    get currentLanguage(): string {
        var language = this.settingsStorage[this.languageKey];
        if (!language) {
            language = "swe_swe";
        }
        return language;
    }

    set currentLanguage(value: string) {
        this.checkLanguage(value);
        this.settingsStorage[this.languageKey] = value;
    }

    private checkLanguage(value: string) {
        if (!this.getLanguages().some((lang) => lang.value === value)) {
            throw new Error( `${value} is not a valid language value`);
        }
    }
}

export = LanguageManager;

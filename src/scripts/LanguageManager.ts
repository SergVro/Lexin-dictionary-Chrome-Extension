import DictionaryFactory = require("./Dictionary/DictionaryFactory");
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

        this.settingsStorage.getItem(this.enabledKey).then((enabledLanguages) => {

        });
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

    getEnabledLanguages(): JQueryPromise<ILanguage[]> {
        return this.settingsStorage.getItem(this.enabledKey).then((enabledLanguagesStr) => {
            // enable all languages by default
            if (!enabledLanguagesStr) {
                return this.setEnabledLanguages(this.languages).then(() => {
                    return this.getEnabledLanguages();
                });
            } else {
                enabledLanguagesStr = enabledLanguagesStr || "";
                var enabledLanguages = enabledLanguagesStr.split(",");
                return this.getCurrentLanguage().then((currentLanguage) => {
                    if (enabledLanguages.indexOf(currentLanguage) === -1) {
                        enabledLanguages.push(currentLanguage);
                    }
                    return this.getLanguages().filter((lang) => enabledLanguages.indexOf(lang.value) >= 0);
                });
            }
        });

    }

    setEnabledLanguages(languages: ILanguage[]): JQueryPromise<void> {
        return this.settingsStorage.setItem(this.enabledKey, languages.map((lang) => lang.value).join(","));
    }

    setEnabledByValues(languages: string[]): JQueryPromise<void> {
        languages.forEach((lang) => this.checkLanguage(lang));
        return this.setEnabledLanguages(languages.map((langValue) => this.getLanguage(langValue)));
    }

    setEnabled(language: string): JQueryPromise<void> {
        return this.changeEnabled(language, true);
    }

    setDisabled(language: string): JQueryPromise<void> {
        return this.changeEnabled(language, false);
    }

    private changeEnabled(language: string, enabled: boolean): JQueryPromise<void> {
        var languageEntity = this.getLanguage(language);
        return this.isEnabled(language).then((alreadyEnabled) => {
            if ((enabled && alreadyEnabled) || (!enabled && !alreadyEnabled)) {
                return $.when<void>(); // nothing to do here, since already enabled or disabled
            }
            return this.getEnabledLanguages().then((languages) => {
                if (enabled) {
                    languages.push(languageEntity);
                } else {
                    languages = languages.filter((lang) => lang.value !== languageEntity.value);
                }
                return this.setEnabledLanguages(languages);
            });
        });

    }

    isEnabled(languageValue: string): JQueryPromise<boolean> {
        this.checkLanguage(languageValue);
        return this.getEnabledLanguages().then((languages) => {
          return languages.some((lang) => lang.value === languageValue);
        });
    }

    getCurrentLanguage(): JQueryPromise<string> {
        return this.settingsStorage.getItem(this.languageKey).then((language) => {
             if (!language) {
                 language = "swe_swe";
             }
             return language;
        });

    }

    setCurrentLanguage(value: string): JQueryPromise<void> {
        this.checkLanguage(value);
        return this.settingsStorage.setItem(this.languageKey, value);
    }

    private checkLanguage(value: string) {
        if (!this.getLanguages().some((lang) => lang.value === value)) {
            throw new Error( `${value} is not a valid language value`);
        }
    }
}

export = LanguageManager;

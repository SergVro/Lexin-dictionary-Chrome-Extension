import interfaces = require("./Interfaces");
import IMessageService = interfaces.IMessageService;
import ISettingsStorage = interfaces.ISettingsStorage;
import ILanguage = interfaces.ILanguage;
import IHistoryItem = interfaces.IHistoryItem;
import LanguageManager = require("./LanguageManager");

class HistoryModel {
    private settingsStorage: ISettingsStorage;
    private messageService: IMessageService;
    private languageManager: LanguageManager;

    constructor(MessageService: IMessageService, languageManager: LanguageManager, settingsStorage: ISettingsStorage) {
        this.messageService = MessageService;
        this.languageManager = languageManager;
        this.settingsStorage = settingsStorage;
    }

    getLanguage() : JQueryPromise<string> {
        return this.languageManager.getCurrentLanguage();
    }

    setLanguage(value : string): JQueryPromise<void> {
        return this.languageManager.setCurrentLanguage(value).then(() => {
            this.fireOnChange();
        });
    }

    getShowDate() : JQueryPromise<boolean> {
        return this.settingsStorage.getItem("showDate").then((showDate) => {
            return !!showDate;
        });
    }
    setShowDate(value: boolean): JQueryPromise<void> {
        return this.settingsStorage.setItem("showDate", value).then(() => {
            this.fireOnChange();
        });
    }

    loadLanguages(): JQueryPromise<ILanguage[]> {
        return this.languageManager.getEnabledLanguages().then((languages) => {
            return languages.filter((item) => item.value !== "swe_swe");
        });
    }

    loadHistory(language: string) : JQueryPromise<IHistoryItem[]> {
        if (language) {
            return this.messageService.loadHistory(language);
        } else {
            var dfd = $.Deferred();
            dfd.resolve([]);
            return dfd.promise();
        }
    }

    clearHistory(language : string) : JQueryPromise<{}> {
        return this.messageService.clearHistory(language);
    }

    onChange : (settings : HistoryModel) => void;

    private fireOnChange() : void {
        if (this.onChange) {
            this.onChange(this);
        }
    }
}

export = HistoryModel

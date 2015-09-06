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

    constructor(MessageService: IMessageService, languageManager: LanguageManager, storage: ISettingsStorage) {
        this.messageService = MessageService;
        this.languageManager = languageManager;
        this.settingsStorage = storage || localStorage;
    }

    get language() : string {
        return this.languageManager.currentLanguage;
    }
    set language(value : string) {
        this.languageManager.currentLanguage = value;
        this.fireOnChange();
    }

    get showDate() : boolean {
        return !!this.settingsStorage["showDate"];
    }
    set showDate(value: boolean) {
        this.settingsStorage["showDate"] = value;
        this.fireOnChange();
    }

    loadLanguages(): ILanguage[] {
        var languages = this.languageManager.getEnabledLanguages();
        return languages.filter((item) => item.value !== "swe_swe");
    }

    loadHistory(language: string) : JQueryPromise<IHistoryItem[]> {
        return this.messageService.loadHistory(language);
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

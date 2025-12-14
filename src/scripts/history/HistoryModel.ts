import { IMessageService, ISettingsStorage, ILanguage, IHistoryItem } from "../common/Interfaces.js";
import LanguageManager from "../common/LanguageManager.js";

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
        const languages = this.languageManager.getEnabledLanguages();
        return languages.filter((item) => item.value !== "swe_swe");
    }

    loadHistory(language: string) : Promise<IHistoryItem[]> {
        return this.messageService.loadHistory(language);
    }

    clearHistory(language : string) : Promise<void> {
        return this.messageService.clearHistory(language);
    }

    onChange : (settings : HistoryModel) => void;

    private fireOnChange() : void {
        if (this.onChange) {
            this.onChange(this);
        }
    }
}

export default HistoryModel;

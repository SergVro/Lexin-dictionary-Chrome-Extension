import { IMessageService, IAsyncSettingsStorage, ILanguage, IHistoryItem } from "../common/Interfaces.js";
import LanguageManager from "../common/LanguageManager.js";

class HistoryModel {
    private settingsStorage: IAsyncSettingsStorage;
    private messageService: IMessageService;
    private languageManager: LanguageManager;
    private cachedLanguage: string | null = null;
    private cachedShowDate: boolean | null = null;

    constructor(MessageService: IMessageService, languageManager: LanguageManager, storage: IAsyncSettingsStorage) {
        this.messageService = MessageService;
        this.languageManager = languageManager;
        this.settingsStorage = storage;
    }

    async getLanguage(): Promise<string> {
        return await this.languageManager.getCurrentLanguage();
    }

    get language() : string {
        // Synchronous getter for backward compatibility - returns cached value or default
        if (this.cachedLanguage !== null) {
            return this.cachedLanguage;
        }
        return "swe_swe"; // default
    }

    async setLanguage(value: string): Promise<void> {
        await this.languageManager.setCurrentLanguage(value);
        this.cachedLanguage = value;
        this.fireOnChange();
    }

    set language(value : string) {
        // Synchronous setter for backward compatibility
        this.setLanguage(value).catch(err => {
            console.error("Error setting language:", err);
        });
    }

    async getShowDate(): Promise<boolean> {
        const value = await this.settingsStorage.getItem("showDate");
        return !!value;
    }

    get showDate() : boolean {
        // Synchronous getter for backward compatibility - returns cached value or false
        if (this.cachedShowDate !== null) {
            return this.cachedShowDate;
        }
        return false; // default
    }

    async setShowDate(value: boolean): Promise<void> {
        await this.settingsStorage.setItem("showDate", value ? "true" : "false");
        this.cachedShowDate = value;
        this.fireOnChange();
    }

    set showDate(value: boolean) {
        // Synchronous setter for backward compatibility
        this.setShowDate(value).catch(err => {
            console.error("Error setting showDate:", err);
        });
    }

    async loadLanguages(): Promise<ILanguage[]> {
        const languages = await this.languageManager.getEnabledLanguages();
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

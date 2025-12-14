import {
    IHistoryItem,
    IMessageService,
    ILanguage,
    ITranslation,
    ILoader,
    IDictionary,
    ITranslationManager,
    IHistoryManager,
    IMessageHandlers,
    GetTranslationHandler,
    LoadHistoryHandler,
    ClearHistoryHandler,
    GetSelectionHandler,
    IAsyncStorage,
    IAsyncSettingsStorage
} from "../../../src/scripts/common/Interfaces.js";
import TranslationDirection from "../../../src/scripts/dictionary/TranslationDirection.js";

export class FakeLoader implements ILoader {
    data: string[] = [];
    urls: string[] = [];
    
    get(url: string): Promise<any> {
        this.urls.push(url);
        const responseData = this.data.shift();
        return Promise.resolve(responseData);
    }
}

export class TestMessageService implements IMessageService {
    loadHistoryCalls = 0;
    clearHistoryCalls = 0;
    selectedText: string = "";

    loadHistory(language: string): Promise<IHistoryItem[]> {
        this.loadHistoryCalls++;
        return Promise.resolve([]);
    }

    clearHistory(language: string): Promise<void> {
        this.clearHistoryCalls++;
        return Promise.resolve();
    }

    getTranslation(word: string, direction?: TranslationDirection): Promise<ITranslation> {
        return Promise.resolve({ translation: null, error: null });
    }

    getSelectedText(): Promise<string> {
        return Promise.resolve(this.selectedText);
    }

    createNewTab(url: string): void {
        // No-op
    }
}

export class FakeDictionary implements IDictionary {
    translation: string = "atranslation";
    isLangSupported: boolean = true;
    supportedLanguages: ILanguage[] = [];
    historyItems: IHistoryItem[] = [{word: "aword", translation: "atranslation", added: new Date().getTime()}];
    
    getTranslation(word: string, langDirection: string, direction: TranslationDirection): Promise<string> {
        return Promise.resolve(this.translation);
    }

    isLanguageSupported(langDirection: string): boolean {
        return this.isLangSupported;
    }

    getSupportedLanguages(): ILanguage[] {
        return this.supportedLanguages;
    }

    parseTranslation(translation: string, langDirection: string): IHistoryItem[] {
        return this.historyItems;
    }

    parse(translation: string, parsingRegExp: RegExp): IHistoryItem[] {
        return this.historyItems;
    }
}

export class FakeTranslationManager implements ITranslationManager {
    translation: string = "atranslation";
    reject: any = null;
    
    getTranslation(word: string, direction: TranslationDirection, languageDirection?: string, skipHistory?: boolean): Promise<string> {
        if (this.reject) {
            return Promise.reject(this.reject);
        } else {
            return Promise.resolve(this.translation);
        }
    }
}

export class FakeHistoryManager implements IHistoryManager {
    history: IHistoryItem[] = [];
    
    async getHistory(langDirection: string): Promise<IHistoryItem[]> {
        return Promise.resolve(this.history);
    }

    async clearHistory(langDirection: string): Promise<void> {
        this.history = [];
        return Promise.resolve();
    }

    async addToHistory(langDirection: string, translations: IHistoryItem[]): Promise<void> {
        this.history = this.history.concat(translations);
        return Promise.resolve();
    }
}

export class FakeAsyncStorage implements IAsyncStorage {
    private storage: { [key: string]: string } = {};

    async getItem(key: string): Promise<string | null> {
        return Promise.resolve(this.storage[key] || null);
    }

    async setItem(key: string, value: string): Promise<void> {
        this.storage[key] = value;
        return Promise.resolve();
    }

    async removeItem(key: string): Promise<void> {
        delete this.storage[key];
        return Promise.resolve();
    }

    async clear(): Promise<void> {
        this.storage = {};
        return Promise.resolve();
    }

    async getLength(): Promise<number> {
        return Promise.resolve(Object.keys(this.storage).length);
    }

    async key(index: number): Promise<string | null> {
        const keys = Object.keys(this.storage);
        return Promise.resolve(index >= 0 && index < keys.length ? keys[index] : null);
    }
}

export class FakeAsyncSettingsStorage implements IAsyncSettingsStorage {
    private storage: { [key: string]: string } = {};

    async getItem(key: string): Promise<string | null> {
        return Promise.resolve(this.storage[key] || null);
    }

    async setItem(key: string, value: string): Promise<void> {
        this.storage[key] = value;
        return Promise.resolve();
    }

    async removeItem(key: string): Promise<void> {
        delete this.storage[key];
        return Promise.resolve();
    }
}

export class FakeMessageHandlers implements IMessageHandlers {
    getTranslationHandler: GetTranslationHandler | null = null;
    loadHistoryHandler: LoadHistoryHandler | null = null;
    clearHistoryHandler: ClearHistoryHandler | null = null;
    getSelectionHandler: GetSelectionHandler | null = null;

    registerGetTranslationHandler(handler: GetTranslationHandler): void {
        this.getTranslationHandler = handler;
    }

    registerLoadHistoryHandler(handler: LoadHistoryHandler): void {
        this.loadHistoryHandler = handler;
    }

    registerClearHistoryHandler(handler: ClearHistoryHandler): void {
        this.clearHistoryHandler = handler;
    }

    registerGetSelectionHandler(handler: GetSelectionHandler): void {
        this.getSelectionHandler = handler;
    }
}

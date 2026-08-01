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
    OpenActionPopupHandler,
    LoadHistoryDirectionsHandler,
    RemoveHistoryItemHandler,
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
    removeHistoryItemCalls = 0;
    selectedText: string = "";
    /** Per-direction rows the page under test should see. */
    history: { [langDirection: string]: IHistoryItem[] } = {};
    directions: string[] = [];

    loadHistory(language: string): Promise<IHistoryItem[]> {
        this.loadHistoryCalls++;
        return Promise.resolve(this.history[language] || []);
    }

    loadHistoryDirections(): Promise<string[]> {
        return Promise.resolve(this.directions);
    }

    clearHistory(language: string): Promise<void> {
        this.clearHistoryCalls++;
        delete this.history[language];
        return Promise.resolve();
    }

    removeHistoryItem(language: string, word: string, added: number): Promise<void> {
        this.removeHistoryItemCalls++;
        this.history[language] = (this.history[language] || [])
            .filter((item) => !(item.word === word && item.added === added));
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

    openActionPopupCalls = 0;

    openActionPopup(): Promise<void> {
        this.openActionPopupCalls++;
        return Promise.resolve();
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
    directions: string[] = [];

    async getHistory(langDirection: string): Promise<IHistoryItem[]> {
        return Promise.resolve(this.history);
    }

    async getDirections(): Promise<string[]> {
        return Promise.resolve(this.directions);
    }

    async clearHistory(langDirection: string): Promise<void> {
        this.history = [];
        return Promise.resolve();
    }

    async removeItem(langDirection: string, word: string, added: number): Promise<void> {
        this.history = this.history.filter((item) => !(item.word === word && item.added === added));
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

    async keys(): Promise<string[]> {
        return Promise.resolve(Object.keys(this.storage));
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
    openActionPopupHandler: OpenActionPopupHandler | null = null;
    loadHistoryDirectionsHandler: LoadHistoryDirectionsHandler | null = null;
    removeHistoryItemHandler: RemoveHistoryItemHandler | null = null;

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

    registerOpenActionPopupHandler(handler: OpenActionPopupHandler): void {
        this.openActionPopupHandler = handler;
    }

    registerLoadHistoryDirectionsHandler(handler: LoadHistoryDirectionsHandler): void {
        this.loadHistoryDirectionsHandler = handler;
    }

    registerRemoveHistoryItemHandler(handler: RemoveHistoryItemHandler): void {
        this.removeHistoryItemHandler = handler;
    }
}

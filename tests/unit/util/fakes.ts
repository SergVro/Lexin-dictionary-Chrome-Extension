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
    GetSelectionHandler
} from "../../../src/scripts/Interfaces.js";
import TranslationDirection from "../../../src/scripts/Dictionary/TranslationDirection.js";

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
    
    getHistory(langDirection: string): IHistoryItem[] {
        return this.history;
    }

    clearHistory(langDirection: string): void {
        this.history = [];
    }

    addToHistory(langDirection: string, translations: IHistoryItem[]): void {
        this.history = this.history.concat(translations);
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

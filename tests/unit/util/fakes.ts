import interfaces = require("src/scripts/Interfaces");
import IHistoryItem = interfaces.IHistoryItem;
import IMessageService  = interfaces.IMessageService;
import ILanguage = interfaces.ILanguage;
import ITranslation = interfaces.ITranslation;
import ILoader = interfaces.ILoader;
import IDictionary = interfaces.IDictionary;
import ITranslationManager = interfaces.ITranslationManager;
import IHistoryManager = interfaces.IHistoryManager;
import IMessageHandlers = interfaces.IMessageHandlers;

import GetTranslationHandler = interfaces.GetTranslationHandler;
import LoadHistoryHandler = interfaces.LoadHistoryHandler;
import ClearHistoryHandler = interfaces.ClearHistoryHandler;
import GetSelectionHandler = interfaces.GetSelectionHandler;



import TranslationDirection = require("src/scripts/Dictionary/TranslationDirection");
import jquery = require("jquery");

export class FakeLoader implements ILoader {
    data: string[];
    urls: string[] = [];
    get(url: string): JQueryPromise<any> {
        this.urls.push(url);
        var result = $.Deferred();
        var responseData = this.data.shift();
        result.resolve(responseData);
        return result.promise();
    }
}

export class TestMessageService implements IMessageService {
    loadHistoryCalls = 0;
    clearHistoryCalls = 0;
    selectedText: string = "";

    loadHistory(language: string): JQueryPromise<IHistoryItem[]> {
        this.loadHistoryCalls++;
        return jquery.Deferred();
    }

    clearHistory(language: string): JQueryPromise<{}> {
        this.clearHistoryCalls++;
        return jquery.Deferred();
    }

    getTranslation(word: string, direction?: TranslationDirection): JQueryPromise<ITranslation> {
        return jquery.Deferred();
    }

    getSelectedText(): JQueryPromise<string> {
        var dfd = $.Deferred<string>();
        dfd.resolve(this.selectedText);
        return dfd.promise();
    }

    createNewTab(url: string) {
    }
}

export class FakeDictionary implements IDictionary {
    translation: string = "atranslation";
    isLangSupported: boolean = true;
    supportedLanguages: ILanguage[] = [];
    historyItems: IHistoryItem[] = [{word: "aword", translation: "atranslation", added: new Date().getTime()}];
    getTranslation(word: string, langDirection: string, direction: TranslationDirection): JQueryPromise<string> {
        var deferred = $.Deferred<string>();
        deferred.resolve(this.translation);
        return deferred.promise();
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
    reject: any;
    getTranslation(word: string, direction: TranslationDirection, languageDirection: string, skipHistory: boolean): JQueryPromise<string> {
        var deferred = $.Deferred<string>();
        if (this.reject) {
            deferred.reject(this.reject);
        } else {
            deferred.resolve(this.translation);
        }
        return deferred.promise();
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
    getTranslationHandler: GetTranslationHandler = null;
    loadHistoryHandler: LoadHistoryHandler = null;
    clearHistoryHandler: ClearHistoryHandler = null;
    getSelectionHandler: GetSelectionHandler = null;

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

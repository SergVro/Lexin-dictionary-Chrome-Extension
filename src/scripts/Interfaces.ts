/// <reference path="..\lib\jquery\jquery.d.ts" />
import TranslationDirection = require("./Dictionary/TranslationDirection");
import MessageType = require("./Messaging/MessageType");

export interface ILanguage {
    value: string;
    text: string;
}

export interface IHistoryItem {
    word: string;
    translation: string;
    added: number;
}

export interface ITranslation {
    translation: string;
    error: string;
}

export interface ISettingsStorage {
    getItem(key: string): JQueryPromise<any>;
    setItem(key: string, value: any): JQueryPromise<void>;
    removeItem(key: string): JQueryPromise<void>;
}

export interface IHistoryManager {
    getHistory(langDirection: string): JQueryPromise<IHistoryItem[]>;
    clearHistory(langDirection: string): JQueryPromise<void>;
    addToHistory(langDirection: string, translations: IHistoryItem[]): JQueryPromise<void>;
}

export interface IMessageService {
    loadHistory(language: string) : JQueryPromise<IHistoryItem[]>;
    clearHistory(language: string) : JQueryPromise<{}>;
    getTranslation(word: string, direction?: TranslationDirection): JQueryPromise<ITranslation>;
    getSelectedText(): JQueryPromise<string>;
    createNewTab(url: string): void;
}

export interface ITranslationManager {
    getTranslation(word: string, direction: TranslationDirection,
                   languageDirection?: string, skipHistory? : boolean): JQueryPromise<string>;
}

export interface ITranslationParser {
    parse(translation: string, parsingRegExp: RegExp): IHistoryItem[];
}

export interface IDictionary extends ITranslationParser{
    getTranslation(word: string, langDirection: string, direction: TranslationDirection): JQueryPromise<string> ;
    isLanguageSupported(langDirection: string): boolean;
    getSupportedLanguages(): ILanguage[];
    parseTranslation(translation: string, langDirection: string): IHistoryItem[];
}

export interface ILoader {
    get(url: string): JQueryPromise<any>;
}

export interface MessageHandler {
    (args: any): any;
}

export interface IMessageBus {
    registerHandler(method: MessageType, handler: MessageHandler, ignoreEmptyResult?: boolean);
    sendMessage(method: MessageType, args?: any): JQueryPromise<any>;
    sendMessageToActiveTab(method: MessageType, args?: any): JQueryPromise<any>;
    createNewTab(url: string): void;
}

export interface GetTranslationHandler {
    (word: string,  direction: TranslationDirection): JQueryPromise<ITranslation>;
}

export interface LoadHistoryHandler {
    (langDirection: string): JQueryPromise<IHistoryItem[]>;
}

export interface ClearHistoryHandler {
    (langDirection: string): JQueryPromise<void>;
}

export interface GetSelectionHandler {
    (): string;
}

export interface IMessageHandlers {
    registerGetTranslationHandler(handler: GetTranslationHandler): void ;
    registerLoadHistoryHandler(handler: LoadHistoryHandler): void;
    registerClearHistoryHandler(handler: ClearHistoryHandler): void;
    registerGetSelectionHandler(handler: GetSelectionHandler): void;
}



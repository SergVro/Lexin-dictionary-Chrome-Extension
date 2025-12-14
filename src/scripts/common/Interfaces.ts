import TranslationDirection from "../dictionary/TranslationDirection.js";
import MessageType from "../messaging/MessageType.js";

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
    [key: string]: any;
}

export interface IHistoryManager {
    getHistory(langDirection: string): IHistoryItem[];
    clearHistory(langDirection: string): void;
    addToHistory(langDirection: string, translations: IHistoryItem[]): void;
}

export interface IMessageService {
    loadHistory(language: string) : Promise<IHistoryItem[]>;
    clearHistory(language: string) : Promise<void>;
    getTranslation(word: string, direction?: TranslationDirection): Promise<ITranslation>;
    getSelectedText(): Promise<string>;
    createNewTab(url: string): void;
}

export interface ITranslationManager {
    getTranslation(word: string, direction: TranslationDirection,
                   languageDirection?: string, skipHistory? : boolean): Promise<string>;
}

export interface ITranslationParser {
    parse(translation: string, parsingRegExp: RegExp): IHistoryItem[];
}

export interface IDictionary extends ITranslationParser{
    getTranslation(word: string, langDirection: string, direction: TranslationDirection): Promise<string> ;
    isLanguageSupported(langDirection: string): boolean;
    getSupportedLanguages(): ILanguage[];
    parseTranslation(translation: string, langDirection: string): IHistoryItem[];
}

export interface ILoader {
    get(url: string): Promise<any>;
}

export interface MessageHandler {
    (args: any): any;
}

export interface IMessageBus {
    registerHandler(method: MessageType, handler: MessageHandler, ignoreEmptyResult?: boolean);
    sendMessage(method: MessageType, args?: any): Promise<any>;
    sendMessageToActiveTab(method: MessageType, args?: any): Promise<any>;
    createNewTab(url: string): void;
}

export interface GetTranslationHandler {
    (word: string,  direction: TranslationDirection): Promise<ITranslation>;
}

export interface LoadHistoryHandler {
    (langDirection: string): IHistoryItem[];
}

export interface ClearHistoryHandler {
    (langDirection: string): void;
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



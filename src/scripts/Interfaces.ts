/// <reference path="..\lib\jquery\jquery.d.ts" />
import TranslationDirection = require("TranslationDirection");

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
    getHistory(langDirection: string, compress: boolean): IHistoryItem[];
    clearHistory(langDirection: string): void;
    addToHistory(langDirection: string, translations: IHistoryItem[]): void;
}

export interface IBackendService {
    loadHistory(language: string) : JQueryPromise<IHistoryItem[]>;
    clearHistory(language: string) : JQueryPromise<{}>;
    getTranslation(word: string, direction?: TranslationDirection): JQueryPromise<ITranslation>;
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

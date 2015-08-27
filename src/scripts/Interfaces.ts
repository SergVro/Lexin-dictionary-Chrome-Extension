/// <reference path="..\lib\jquery\jquery.d.ts" />

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
    addToHistory(langDirection: string, translation: string): void;
}

export interface IBackendService {
    loadHistory(language: string) : JQueryPromise<IHistoryItem[]>;
    clearHistory(language: string) : JQueryPromise<{}>;
    getTranslation(word: string, direction?: string): JQueryPromise<ITranslation>;
}

export interface ITranslationParser {
    parseTranslation(translation: string, langDirection: string): IHistoryItem[];
}

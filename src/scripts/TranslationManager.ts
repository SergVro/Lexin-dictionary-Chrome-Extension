/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\google.analytics\ga.d.ts" />

import $ = require("jquery");
import interfaces = require("./Interfaces");
import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import LanguageManager = require("./LanguageManager");
import IHistoryManager = interfaces.IHistoryManager;
import ILanguage = interfaces.ILanguage;
import ITranslation = interfaces.ITranslation;

import TranslationDirection = require("./TranslationDirection");

class TranslationManager {

    historyManager: IHistoryManager;
    dictionaryFactory: DictionaryFactory;
    languageManager: LanguageManager;

    constructor(historyManager : IHistoryManager, dictionaryFactory: DictionaryFactory, languageManager: LanguageManager) {
        this.historyManager = historyManager;
        this.dictionaryFactory = dictionaryFactory;
        this.languageManager = languageManager;
    }

    getTranslation(word: string, direction: TranslationDirection,
                   languageDirection?: string, skipHistory? : boolean): JQueryPromise<string> {
        //  Summary
        //      Returns a translation for the specified word
        var deferred = $.Deferred(), self = this;
        word = $.trim(word);
        if (!word) {
            console.error("word is required");
            deferred.reject("word is required");
            return deferred;
        }
        var langDirection = languageDirection || this.languageManager.currentLanguage;
        var dictionary = this.dictionaryFactory.getDictionary(langDirection);
        dictionary.getTranslation(word, langDirection, direction).done((data) => {
            if (!skipHistory) {
                var translations = dictionary.parseTranslation(data, langDirection);
                this.historyManager.addToHistory(langDirection, translations);
            }
            deferred.resolve(data);
        }).fail((error) => {
            deferred.reject(error);
        });
        return deferred.promise();
    }
}

export = TranslationManager;

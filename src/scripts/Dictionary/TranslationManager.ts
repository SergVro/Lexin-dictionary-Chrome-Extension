/// <reference path="../../lib/jquery/jquery.d.ts" />

import $ = require("jquery");
import DictionaryFactory = require("./DictionaryFactory");
import LanguageManager = require("../LanguageManager");
import Tracker = require("../Tracker");
import interfaces = require("../Interfaces");
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
        var deferred = $.Deferred();
        word = $.trim(word);
        if (!word) {
            deferred.reject("word is required");
            return deferred;
        }
        this.languageManager.getCurrentLanguage().then((currentLanguage) => {
            var langDirection = languageDirection || currentLanguage;
            var dictionary = this.dictionaryFactory.getDictionary(langDirection);
            dictionary.getTranslation(word, langDirection, direction).done((data) => {
                deferred.resolve(data);

                Tracker.translation(langDirection);
                if (!skipHistory) {
                    var translations = dictionary.parseTranslation(data, langDirection);
                    this.historyManager.addToHistory(langDirection, translations);
                }
            }).fail((error) => {
                deferred.reject(error);

                Tracker.translationError(langDirection);
            });
        });

        return deferred.promise();
    }
}

export = TranslationManager;

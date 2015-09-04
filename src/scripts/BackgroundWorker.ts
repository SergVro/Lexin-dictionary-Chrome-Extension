/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\google.analytics\ga.d.ts" />

import $ = require("jquery");
import interfaces = require("./Interfaces");
import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import IHistoryManager = interfaces.IHistoryManager;
import ILanguage = interfaces.ILanguage;
import ITranslation = interfaces.ITranslation;

import BackendMethods = require("./BackendMethods");
import TranslationDirection = require("./TranslationDirection");

class BackgroundWorker {

    historyManager: IHistoryManager;
    dictionaryFactory: DictionaryFactory;

    constructor(historyManager : IHistoryManager, dictionaryFactory: DictionaryFactory) {
        this.historyManager = historyManager;
        this.dictionaryFactory = dictionaryFactory;
    }

    getTranslation(word: string, direction: TranslationDirection): JQueryPromise<string> {
        //  Summary
        //      Returns a translation for the specified word
        var deferred = $.Deferred(), self = this;
        word = $.trim(word);
        if (!word) {
            console.error("word is required");
            deferred.reject("word is required");
            return deferred;
        }

        var langDirection = localStorage["defaultLanguage"];
        //_gaq.push(["_trackEvent", "Translation", langDirection, word]);
        if (!langDirection) {
            langDirection = "swe_swe";
            localStorage["defaultLanguage"] = langDirection;
        }

        var dictionary = this.dictionaryFactory.getDictionary(langDirection);

        dictionary.getTranslation(word, langDirection, direction).done(function(data){
            deferred.resolve(data);
            var translations = dictionary.parseTranslation(data, langDirection);
            self.historyManager.addToHistory(langDirection, translations);
        }).fail((error) => {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    // ----------------------------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------------------------

    initialize() {
        var self = this;
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.method === BackendMethods.getTranslation) {
                self.getTranslation(request.word, request.direction).then(function (data) {
                    var response : ITranslation = {translation: data, error: null};
                    sendResponse(response);
                }).fail(function (error) {
                    var errorMessage = "Error connecting to the dictionary service: " +
                        (error ? error.status : "Unknown");
                    var response : ITranslation = {translation: null, error: errorMessage};
                    sendResponse(response);
                });
            } else if (request.method === BackendMethods.getHistory) {
                sendResponse(self.historyManager.getHistory(request.langDirection, true));
            } else if (request.method === BackendMethods.clearHistory) {
                self.historyManager.clearHistory(request.langDirection);
                sendResponse();
            } else {
                sendResponse({});
            }
            return true;
        });
    }
}

export = BackgroundWorker;

/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\google.analytics\ga.d.ts" />

import $ = require("jquery");
import interfaces = require("./Interfaces");
import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import IHistoryManager = interfaces.IHistoryManager;
import ITranslation = interfaces.ITranslation;
import ITranslationManager = interfaces.ITranslationManager;

import BackendMethods = require("./BackendMethods");
import TranslationDirection = require("./TranslationDirection");


class BackgroundWorker {

    historyManager: IHistoryManager;
    translationManager: ITranslationManager;

    constructor(historyManager : IHistoryManager, translationManager: ITranslationManager) {
        this.historyManager = historyManager;
        this.translationManager = translationManager;
    }

    getTranslation(word: string, direction: TranslationDirection): JQueryPromise<ITranslation> {
        var result =  $.Deferred<ITranslation>();
        this.translationManager.getTranslation(word, direction).then(function (data) {
            var response : ITranslation = {translation: data, error: null};
            result.resolve(response);
        }).fail(function (error) {
            var errorMessage = "Error connecting to the dictionary service: " +
                (error ? error.status : "Unknown");
            var response : ITranslation = {translation: null, error: errorMessage};
            result.resolve(response);
        });
        return result.promise();
    }

    initialize() {
        var self = this;
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.method === BackendMethods.getTranslation) {
                self.getTranslation(request.word, request.direction).then(function (data) {
                    sendResponse(data);
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

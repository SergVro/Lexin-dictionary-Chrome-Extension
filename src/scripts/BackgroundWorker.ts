/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\google.analytics\ga.d.ts" />

import $ = require("jquery");
import interfaces = require("./Interfaces");
import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import IHistoryManager = interfaces.IHistoryManager;
import ITranslation = interfaces.ITranslation;
import ITranslationManager = interfaces.ITranslationManager;

import MessageBus = require("./MessageBus");
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
        MessageBus.Instance.registerHandler(BackendMethods.getTranslation, (args) => {
            return this.getTranslation(args.word, args.direction);
        });

        MessageBus.Instance.registerHandler(BackendMethods.getHistory, (args) => {
            return this.historyManager.getHistory(args.langDirection, true);
        });

        MessageBus.Instance.registerHandler(BackendMethods.clearHistory, (args) => {
            this.historyManager.clearHistory(args.langDirection);
            return;
        });
    }
}

export = BackgroundWorker;

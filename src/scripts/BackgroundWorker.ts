/// <reference path="..\lib\jquery\jquery.d.ts" />

import $ = require("jquery");
import interfaces = require("./Interfaces");
import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import IHistoryManager = interfaces.IHistoryManager;
import ITranslation = interfaces.ITranslation;
import ITranslationManager = interfaces.ITranslationManager;
import IMessageHandlers = interfaces.IMessageHandlers;

import TranslationDirection = require("./Dictionary/TranslationDirection");

class BackgroundWorker {

    private historyManager: IHistoryManager;
    private translationManager: ITranslationManager;
    private messageHandlers: IMessageHandlers;

    constructor(historyManager : IHistoryManager, translationManager: ITranslationManager, messageHandlers: IMessageHandlers) {
        this.historyManager = historyManager;
        this.translationManager = translationManager;
        this.messageHandlers = messageHandlers;
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
        this.messageHandlers.registerGetTranslationHandler((word, direction) => this.getTranslation(word, direction));
        this.messageHandlers.registerLoadHistoryHandler((langDirection) => this.historyManager.getHistory(langDirection));
        this.messageHandlers.registerClearHistoryHandler((langDirection) => this.historyManager.clearHistory(langDirection));
    }
}

export = BackgroundWorker;

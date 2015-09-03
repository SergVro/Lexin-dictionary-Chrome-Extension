/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\chrome\chrome.d.ts" />

import interfaces = require("./Interfaces");
import IBackendService = interfaces.IBackendService;
import ILanguage = interfaces.ILanguage;
import IHistoryItem = interfaces.IHistoryItem;
import ITranslation = interfaces.ITranslation;

import BackendMethods = require("./BackendMethods");
import TranslationDirection = require("./TranslationDirection");

class BackendService implements IBackendService{

    loadHistory(language: string) : JQueryPromise<IHistoryItem[]> {
        var result = $.Deferred();
        chrome.runtime.sendMessage({ method: BackendMethods.getHistory, langDirection: language }, function (history: IHistoryItem[]) {
            result.resolve(history);
        });
        return result.promise();
    }

    clearHistory(language: string) : JQueryPromise<{}> {
        var result = $.Deferred();
        chrome.runtime.sendMessage({ method: BackendMethods.clearHistory, langDirection: language}, function () {
            result.resolve();
        });
        return result.promise();
    }

    getTranslation(word: string, direction?: TranslationDirection): JQueryPromise<ITranslation> {
        var result = $.Deferred();
        chrome.runtime.sendMessage({
            method: BackendMethods.getTranslation,
            word: word,
            direction: direction || TranslationDirection.to
        }, function (response) {
            result.resolve(response);
        });
        return result.promise();
    }
}

export = BackendService;

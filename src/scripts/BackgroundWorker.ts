/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\google.analytics\ga.d.ts" />

import $ = require("jquery");
import interfaces = require("./Interfaces");
import IHistoryManager = interfaces.IHistoryManager;
import ILanguage = interfaces.ILanguage;
import ITranslation = interfaces.ITranslation;

import BackendMethods = require("./BackendMethods");

class BackgroundWorker {

    historyManager: IHistoryManager;

    getTranslation(word: string, direction: string): JQueryPromise<string> {
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

        var query = "http://lexin.nada.kth.se/lexin/service?searchinfo=" +
            (direction || "to") + "," + langDirection + "," + encodeURIComponent(word);
        if (langDirection === "swe_eng") {
            query = "http://folkets-lexikon.csc.kth.se/folkets/service?lang=" +
                (direction === "from" ? "en" : "sv") + "&interface=en&word=" + encodeURIComponent(word);
        }
        $.get(query).done(function (data) {
            if (!self.isWordFound(word, data) && word.toLowerCase() !== word) {
                // retry with word in lowercase if no hit
                self.getTranslation(word.toLowerCase(), direction).done(function (dataLower) {
                    deferred.resolve(dataLower);
                });
            } else {
                deferred.resolve(data);
                self.historyManager.addToHistory(langDirection, data);
            }
        }).fail(function (error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    isWordFound(word, data) {
        var decodedData = this.htmlDecode(data);
        return !(decodedData.indexOf(word + " - Ingen unik träff") > -1
        || decodedData.indexOf(word + " - Ingen träff") > -1
        || decodedData.indexOf(word + " - No hit") > -1);
    }

    htmlDecode(value: string): string {
        return $("<div />").html(value).text();
    }
    // ----------------------------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------------------------

    constructor(historyManager : IHistoryManager) {
        this.historyManager = historyManager;
    }

    initialize() {
        var self = this;
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.method === BackendMethods.getTranslation) {
                self.getTranslation(request.word, request.direction || "to").then(function (data) {
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

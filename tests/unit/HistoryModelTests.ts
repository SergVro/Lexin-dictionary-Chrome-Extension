/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />
/// <reference path="../../src/lib/jquery/jquery.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import HistoryModel = require("src/scripts/HistoryModel");
import DictionaryFactory = require("src/scripts/DictionaryFactory");
import LanguageManager = require("src/scripts/LanguageManager");
import interfaces = require("src/scripts/Interfaces");

import IHistoryItem = interfaces.IHistoryItem;
import IBackendService  = interfaces.IBackendService;
import ILanguage = interfaces.ILanguage;
import ITranslation = interfaces.ITranslation;
import ISettingsStorage = interfaces.ISettingsStorage;
import TranslationDirection = require("src/scripts/TranslationDirection");

import jquery = require("jquery");

class TestBackendService implements IBackendService {
    loadHistoryCalls = 0;
    clearHistoryCalls = 0;


    loadHistory(language: string): JQueryPromise<IHistoryItem[]> {
        this.loadHistoryCalls++;
        return jquery.Deferred();
    }

    clearHistory(language: string): JQueryPromise<{}> {
        this.clearHistoryCalls++;
        return jquery.Deferred();
    }

    getTranslation(word: string, direction?: TranslationDirection): JQueryPromise<ITranslation> {
        return jquery.Deferred();
    }
}

var mockBackendService: TestBackendService,
    mockSettingsStorage: ISettingsStorage,
    dictionaryFactory: DictionaryFactory,
    languageManager: LanguageManager,
    historyModel: HistoryModel;


registerSuite({
    name: "HistoryModel",
    beforeEach() {
        mockBackendService = new TestBackendService();
        mockSettingsStorage = {};
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
        historyModel = new HistoryModel(mockBackendService, languageManager, mockSettingsStorage);
    },
    // Assume we have a promises interface defined
    "default data"() {

        assert.strictEqual(historyModel.language, "swe_swe", "default language should be Swedish");
        assert.strictEqual(historyModel.showDate, false, "default value for showDate should be false");

    },
    "setters": {
        "language"() {
            var testLanguage = "swe_eng";

            historyModel.onChange = (model) => assert.strictEqual(model.language, testLanguage);
            historyModel.language = testLanguage;

            assert.strictEqual(historyModel.language, testLanguage);
        },
        "show date"() {
            historyModel.onChange = (model) => assert.strictEqual(model.showDate, true);
            historyModel.showDate = true;

            assert.strictEqual(historyModel.showDate, true);
            assert.strictEqual(mockSettingsStorage["showDate"], true);
        }

    },
    "methods": {
        "load languages"() {
            var languages = historyModel.loadLanguages();
            assert.equal(languages.length, 19, "By default languages list should be all languages except swe_swe");
        },

        "load history"() {
            historyModel.loadHistory("swe_eng");
            assert.strictEqual(mockBackendService.loadHistoryCalls, 1);
        },

        "clear history"() {
            historyModel.clearHistory("swe_eng");
            assert.strictEqual(mockBackendService.clearHistoryCalls, 1);
        }
    }

});

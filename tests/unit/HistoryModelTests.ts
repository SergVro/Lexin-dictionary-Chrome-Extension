/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />
/// <reference path="../../src/lib/jquery/jquery.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import HistoryModel = require("src/scripts/HistoryModel");
import DictionaryFactory = require("src/scripts/Dictionary/DictionaryFactory");
import TranslationDirection = require("src/scripts/Dictionary/TranslationDirection");
import LanguageManager = require("src/scripts/LanguageManager");

import interfaces = require("src/scripts/Interfaces");
import IHistoryItem = interfaces.IHistoryItem;
import IMessageService  = interfaces.IMessageService;
import ILanguage = interfaces.ILanguage;
import ITranslation = interfaces.ITranslation;
import ISettingsStorage = interfaces.ISettingsStorage;

import fakes = require("tests/unit/util/fakes");
import TestMessageService = fakes.TestMessageService;

var mockMessageService: TestMessageService,
    mockSettingsStorage: ISettingsStorage,
    dictionaryFactory: DictionaryFactory,
    languageManager: LanguageManager,
    historyModel: HistoryModel;


registerSuite({
    name: "HistoryModel",
    beforeEach() {
        mockMessageService = new TestMessageService();
        mockSettingsStorage = {};
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
        historyModel = new HistoryModel(mockMessageService, languageManager, mockSettingsStorage);
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
            assert.strictEqual(mockMessageService.loadHistoryCalls, 1);
        },

        "clear history"() {
            historyModel.clearHistory("swe_eng");
            assert.strictEqual(mockMessageService.clearHistoryCalls, 1);
        }
    }

});

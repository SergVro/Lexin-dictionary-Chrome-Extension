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
import LocalStorage = require("src/scripts/Storage/LocalStorage");

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
        mockSettingsStorage = new LocalStorage();
        localStorage.clear();
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
        historyModel = new HistoryModel(mockMessageService, languageManager, mockSettingsStorage);
    },
    // Assume we have a promises interface defined
    "default data"() {

        return historyModel.getLanguage().then((language) => {
            assert.strictEqual(language, "swe_swe", "default language should be Swedish");
            return historyModel.getShowDate().then((showDate) => {
                assert.strictEqual(showDate, false, "default value for showDate should be false");
            });
        });
    },
    "setters": {
        "language"() {
            var testLanguage = "swe_eng";
            return historyModel.setLanguage(testLanguage).then(() => {
                return historyModel.getLanguage().then((lang) => {
                    assert.strictEqual(lang, testLanguage);
                });
            });
        },

        "show date"() {
            return historyModel.setShowDate(true).then(() => {
                return historyModel.getShowDate().then((show) => {
                    assert.strictEqual(show, true);
                });
            });
        }

    },
    "methods": {
        "load languages"() {
            historyModel.loadLanguages().then((languages) => {
                assert.equal(languages.length, 19, "By default languages list should be all languages except swe_swe");
            });
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

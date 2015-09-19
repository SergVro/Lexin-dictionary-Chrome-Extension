/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryFactory = require("src/scripts/Dictionary/DictionaryFactory");
import TranslationParser = require("src/scripts/Dictionary/TranslationParser");
import TranslationManager = require("src/scripts/Dictionary/TranslationManager");
import TranslationDirection = require("src/scripts/Dictionary/TranslationDirection");

import BackgroundWorker = require("src/scripts/BackgroundWorker");
import HistoryManager = require("src/scripts/HistoryManager");
import LanguageManager = require("src/scripts/LanguageManager");

import interfaces = require("src/scripts/Interfaces");
import ISettingsStorage = interfaces.ISettingsStorage;

import fakes = require("tests/unit/util/fakes");
import FakeDictionary = fakes.FakeDictionary;

import LocalStorage = require("src/scripts/Storage/LocalStorage");


var translationManager: TranslationManager,
    fakeDictionary: FakeDictionary,
    languageManager: LanguageManager,
    historyManager: HistoryManager,
    localStore: ISettingsStorage;


registerSuite({
    name: "TranslationManager",
    beforeEach() {
        localStore = new LocalStorage();
        localStorage.clear();

        fakeDictionary = new FakeDictionary();

        var translationParser = new TranslationParser(),
            dictionaryFactory = new DictionaryFactory([fakeDictionary]);

        languageManager = new LanguageManager(localStore, dictionaryFactory);
        historyManager = new HistoryManager(translationParser, localStore);
        translationManager = new TranslationManager(historyManager, dictionaryFactory, languageManager);

        localStorage.clear();
    },

    teardown() {
        localStorage.clear();
    },

    "getTranslation": {
        "get word translation"() {
            var dfd = this.async();
            translationManager.getTranslation("aword", TranslationDirection.to).then((translation) => {
                assert.equal(translation, "atranslation");
                dfd.resolve();
            });
        },

        "add word to history"() {
            var dfd = this.async();
            translationManager.getTranslation("aword", TranslationDirection.to).then((translation) => {
                languageManager.getCurrentLanguage().then((language) => {
                    historyManager.getHistory(language).then((history) => {
                        assert.equal(history.length, 1);
                        assert.equal(history[0].word, "aword");
                        assert.equal(history[0].translation, "atranslation");
                        dfd.resolve();
                    });
                });

            });
        },

        "skip add word to history"() {
            var dfd = this.async();
            translationManager.getTranslation("aword", TranslationDirection.to, null, true).then((translation) => {
                languageManager.getCurrentLanguage().then((language) => {
                    historyManager.getHistory(language).then((history) => {
                        assert.equal(history.length, 0);
                        dfd.resolve();
                    });
                });
            });
        },

        "get translation empty word"() {
            var dfd = this.async();
            translationManager.getTranslation(" ", TranslationDirection.to).done((translation) => {
                dfd.reject(new Error("getTranslation should reject"));
            }).fail((e) => {
                assert.equal(e, "word is required");
                dfd.resolve();
            });
        }
    }
});

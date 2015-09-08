/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryFactory = require("src/scripts/Dictionary/DictionaryFactory");
import BackgroundWorker = require("src/scripts/BackgroundWorker");
import HistoryManager = require("src/scripts/HistoryManager");
import LanguageManager = require("src/scripts/LanguageManager");
import TranslationParser = require("src/scripts/Dictionary/TranslationParser");
import TranslationManager = require("src/scripts/Dictionary/TranslationManager");

import interfaces = require("src/scripts/Interfaces");
import ISettingsStorage = interfaces.ISettingsStorage;

import fakes = require("tests/unit/util/fakes");

var historyManager: HistoryManager;

registerSuite({
    name: "HistoryManager",
    // Assume we have a promises interface defined
    beforeEach() {
        localStorage.clear();
        var translationParser = new TranslationParser();
        historyManager = new HistoryManager(translationParser, localStorage);
    },

    teardown() {
        localStorage.clear();
    },

    "getHistory": {
        "empty history"() {
            var testHistory = historyManager.getHistory("swe_foo");
            assert.equal(testHistory.length, 0);
        },

        "with item"() {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            var testHistory = historyManager.getHistory("swe_foo");
            assert.equal(testHistory.length, 1);
            assert.equal(testHistory[0].word, "test_word");
        },

        "compress full duplicates"() {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation", added: new Date().getTime()}
            ]);

            var testHistory = historyManager.getHistory("swe_foo");
            assert.equal(testHistory.length, 1);
            assert.equal(testHistory[0].word, "test_word");
        },

        "compress duplicate words"() {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation2", added: new Date().getTime()}
            ]);

            var testHistory = historyManager.getHistory("swe_foo");
            assert.equal(testHistory.length, 1);
            assert.equal(testHistory[0].word, "test_word");
            assert.equal(testHistory[0].translation, "test_translation; test_translation2");
        },

        "compress duplicate translations"() {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation; test_translation2", added: new Date().getTime()},
                {word: "test_word", translation: "test_translation2; test_translation3", added: new Date().getTime()}
            ]);

            var testHistory = historyManager.getHistory("swe_foo");
            assert.equal(testHistory.length, 1);
            assert.equal(testHistory[0].word, "test_word");
            assert.equal(testHistory[0].translation, "test_translation; test_translation2; test_translation3");
        },


        "sort"() {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date(2015, 9, 1).getTime()},
                {word: "test_word2", translation: "test_translation2", added: new Date(2015, 9, 5).getTime()},
                {word: "test_word3", translation: "test_translation3", added: new Date(2015, 9, 3).getTime()}
            ]);

            var testHistory = historyManager.getHistory("swe_foo");
            assert.equal(testHistory.length, 3);
            assert.equal(testHistory[0].word, "test_word2");
            assert.equal(testHistory[1].word, "test_word3");
            assert.equal(testHistory[2].word, "test_word");
        }

    },

    "clearHistory": {
        "clearHistory for language"() {
            historyManager.addToHistory("swe_foo", [
                {word: "test_word", translation: "test_translation", added: new Date().getTime()},
            ]);
            historyManager.addToHistory("swe_bar", [
                {word: "test_word2", translation: "test_translation2", added: new Date().getTime()}
            ]);

            historyManager.clearHistory("swe_foo");

            var history_swe_foo = historyManager.getHistory("swe_foo");
            var history_swe_bar = historyManager.getHistory("swe_bar");

            assert.equal(history_swe_foo.length, 0);
            assert.equal(history_swe_bar.length, 1);
        }
    },

    "compress too long history"() {

        var addCount = 15;
        historyManager.maxHistory = 10;
        var addedValue = new Date().getTime();
        for (var i = 0; i < addCount; i++) {
            var item = {
                word: `testWord ${i}`,
                translation: `test translation ${i}`,
                added: addedValue + i // to ensure each next item gets greater value then previous
            };
            historyManager.addToHistory("swe_foo", [item]);
        }
        var history = historyManager.getHistory("swe_foo");
        assert.isTrue(history.length < addCount);
        for (var j = 0; j < history.length; j++) {
            assert.equal(`testWord ${addCount - 1 - j}`, history[j].word, `wrong element at ${j}`);
        }
    }

});

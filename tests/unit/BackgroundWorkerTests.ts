/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryFactory = require("src/scripts/DictionaryFactory");
import BackgroundWorker = require("src/scripts/BackgroundWorker");
import HistoryManager = require("src/scripts/HistoryManager");
import TranslationParser = require("src/scripts/Dictionaries/TranslationParser");

var backgroundWorker: BackgroundWorker;
registerSuite({
    name: "BackgroundWorker",
    // Assume we have a promises interface defined
    beforeEach() {
        var translationParser = new TranslationParser(),
            historyManager = new HistoryManager(translationParser, localStorage),
            dictionaryFactory = new DictionaryFactory();

        backgroundWorker = new BackgroundWorker(historyManager, dictionaryFactory);
    },

});

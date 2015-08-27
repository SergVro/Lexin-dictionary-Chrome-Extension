/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import BackgroundWorker = require("src/scripts/BackgroundWorker");
import HistoryManager = require("src/scripts/HistoryManager");
import TranslationParser = require("src/scripts/TranslationParser");

registerSuite({
    name: "BackgroundWorker",
    // Assume we have a promises interface defined
    "isWordFound"() {

        var translationParser = new TranslationParser(),
            historyManager = new HistoryManager(translationParser, localStorage),
            backgroundWorker = new BackgroundWorker(historyManager);

        assert.isFalse(backgroundWorker.isWordFound("test", "test - No hit"),
            "isWordFound should return  false if response contains No hit");
        assert.isFalse(backgroundWorker.isWordFound("test", "test - Ingen träff"),
            "isWordFound should return  false if response contains Ingen träff");
        assert.isFalse(backgroundWorker.isWordFound("test", "test - Ingen unik träff"),
            "isWordFound should return  false if response contains Ingen unik träff");
    },
    "htmlDecode"() {

        var translationParser = new TranslationParser(),
            historyManager = new HistoryManager(translationParser, localStorage),
            backgroundWorker = new BackgroundWorker(historyManager);

        assert.equal(backgroundWorker.htmlDecode("Ingen unik tr&auml;ff"), "Ingen unik träff",
            "htmlDecode should replace html encoded symbols");
    }
});

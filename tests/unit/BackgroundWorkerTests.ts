/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import BackgroundWorker = require("src/scripts/BackgroundWorker");
import TranslationDirection = require("src/scripts/TranslationDirection");

import fakes = require("tests/unit/util/fakes");
import FakeHistoryManager = fakes.FakeHistoryManager;
import FakeTranslationManager = fakes.FakeTranslationManager;


var backgroundWorker: BackgroundWorker,
    fakeHistoryManager: FakeHistoryManager,
    fakeTranslationManager: FakeTranslationManager;

registerSuite({
    name: "BackgroundWorker",
    // Assume we have a promises interface defined
    beforeEach() {
        fakeHistoryManager = new FakeHistoryManager();
        fakeTranslationManager = new FakeTranslationManager();

        backgroundWorker = new BackgroundWorker(fakeHistoryManager, fakeTranslationManager);
    },

    "getTranslation": {
        "get word translation"() {
            var dfd = this.async(500);
            backgroundWorker.getTranslation("aword", TranslationDirection.to).done((translation) => {
                assert.equal(translation.translation, fakeTranslationManager.translation);
                assert.isNull(translation.error);
                dfd.resolve();
            });
        },

        "get translation failure"() {
            var dfd = this.async(500);
            fakeTranslationManager.reject = {status: 404};
            backgroundWorker.getTranslation("aword", TranslationDirection.to).done((translation) => {
                assert.equal(translation.error, "Error connecting to the dictionary service: 404");
                assert.isNull(translation.translation);
                dfd.resolve();
            }).fail((translation) => {
                dfd.reject(new Error("Should not reject"));
            });

        }
    }

});

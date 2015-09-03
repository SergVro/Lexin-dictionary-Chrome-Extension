/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryFactory = require("src/scripts/DictionaryFactory");
import TranslationDirection = require("src/scripts/TranslationDirection");

var factory: DictionaryFactory;

registerSuite({
    name: "DictionaryFactory",

    beforeEach() {
        factory = new DictionaryFactory();
    },
    // Assume we have a promises interface defined
    "getAllSupportedLanguages"() {
        var languages = factory.getAllSupportedLanguages();
        assert.strictEqual (languages.length, 20, "getLanguages should return list of 20 languages");
    },

    "getDictionary": {
        "getLexikon"() {
            var dictionary = factory.getDictionary("swe_swe");
            assert.equal(dictionary.getSupportedLanguages().length, 19);
        },

        "getFolkets"() {
            var dictionary = factory.getDictionary("swe_eng");
            assert.equal(dictionary.getSupportedLanguages()[0].value, "swe_eng");
        },

        "getUnknown"() {
            assert.throw(() => factory.getDictionary("swe_bbb"), "There is not dictionary with support of swe_bbb");
        }
    }

});


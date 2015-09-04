/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import LexinDictionary = require("src/scripts/Dictionary/LexinDictionary");
import TranslationDirection = require("src/scripts/TranslationDirection");

var dictionary: LexinDictionary;

registerSuite({
    name: "LexinDictionary",

    beforeEach() {
        dictionary = new LexinDictionary();
    },
    // Assume we have a promises interface defined
    "getLanguages"() {
        var languages = dictionary.getSupportedLanguages();
        assert.strictEqual (languages.length, 19, "getLanguages should return list of 19 languages");
    },

    "isLanguageSupported"() {
            assert.isTrue(dictionary.isLanguageSupported("swe_swe"));
            assert.isFalse(dictionary.isLanguageSupported("swe_eng"));
    },

    "queryUrl": {
        "bil_swe_rus_to"() {
            assert.equal(dictionary.createQueryUrl("bil", "swe_rus", TranslationDirection.to),
                "http://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,bil");
        },

        "katt_swe_swe_from"() {
            assert.equal(dictionary.createQueryUrl("katt", "swe_swe", TranslationDirection.from),
                "http://lexin.nada.kth.se/lexin/service?searchinfo=from,swe_swe,katt");
        }
    },

    "isWordFound"() {

        assert.isFalse(dictionary.isWordFound("test", "test - Ingen träff"),
            "isWordFound should return  false if response contains Ingen träff");
        assert.isFalse(dictionary.isWordFound("test", "test - Ingen unik träff"),
            "isWordFound should return  false if response contains Ingen unik träff");
    },

});

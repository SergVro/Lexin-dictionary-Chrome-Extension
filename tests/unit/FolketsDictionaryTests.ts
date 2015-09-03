/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import FolketsDictionary = require("src/scripts/Dictionaries/FolketsDictionary");
import TranslationDirection = require("src/scripts/TranslationDirection");

var dictionary: FolketsDictionary;

registerSuite({
    name: "FolketsDictionary",

    beforeEach() {
        dictionary = new FolketsDictionary();
    },
    // Assume we have a promises interface defined
    "getLanguages"() {
        var languages = dictionary.getSupportedLanguages();
        assert.strictEqual (languages.length, 1, "getLanguages should return list of 1 languages");
    },

    "isLanguageSupported"() {
            assert.isFalse(dictionary.isLanguageSupported("swe_swe"));
            assert.isTrue(dictionary.isLanguageSupported("swe_eng"));
    },

    "queryUrl": {
        "bil_swe_eng_to"() {
            assert.equal(dictionary.createQueryUrl("bil", "swe_eng", TranslationDirection.to),
                "http://folkets-lexikon.csc.kth.se/folkets/service?lang=sv&interface=en&word=bil");
        },

        "katt_swe_eng_from"() {
            assert.equal(dictionary.createQueryUrl("katt", "swe_eng", TranslationDirection.from),
                "http://folkets-lexikon.csc.kth.se/folkets/service?lang=en&interface=en&word=katt");
        }
    },

    "isWordFound"() {

        assert.isFalse(dictionary.isWordFound("test", "test - No hit"),
            "isWordFound should return  false if response contains No hit");
    },

});

/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />
/// <reference path="./data/texttemplates.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import fakes = require("tests/unit/util/fakes");
import FakeLoader = fakes.FakeLoader;

import FolketsDictionary = require("src/scripts/Dictionary/FolketsDictionary");
import TranslationDirection = require("src/scripts/TranslationDirection");

import swe_eng_translation_multi = require("intern/dojo/text!tests/unit/data/swe_eng_translation_multi.html");

var dictionary: FolketsDictionary,
    loader: FakeLoader;

registerSuite({
    name: "FolketsDictionary",

    beforeEach() {
        loader = new FakeLoader();
        dictionary = new FolketsDictionary(loader);
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

    "getTranslation"() {
        var dfd = this.async(1000);
        loader.data = [swe_eng_translation_multi];
        var translation = dictionary.getTranslation("hem", "swe_eng", TranslationDirection.to);
        return translation.done((data) => {
            assert.isTrue(data.length > 0, "getTranslation should return html with translation");
            dfd.resolve();
        });
    },

    "parse"() {
        var history = dictionary.parseTranslation(swe_eng_translation_multi, "swe_eng");

        assert.equal(history.length, 3);
        assert.equal(history[0].word, "hem");    assert.equal(history[0].translation, "home");
        assert.equal(history[1].word, "hem");    assert.equal(history[1].translation, "home");
        assert.equal(history[2].word, "hem");    assert.equal(history[2].translation, "house");
    }

});

/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />
/// <reference path="./data/texttemplates.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import interfaces = require("src/scripts/Interfaces");
import ILoader = interfaces.ILoader;
import fakes = require("tests/unit/util/fakes");
import FakeLoader = fakes.FakeLoader;

import LexinDictionary = require("src/scripts/Dictionary/LexinDictionary");
import TranslationDirection = require("src/scripts/TranslationDirection");

import swe_rus_translation_multi = require("intern/dojo/text!tests/unit/data/swe_rus_translation_multi.html");

var dictionary: LexinDictionary,
    loader: FakeLoader;

registerSuite({
    name: "LexinDictionary",

    beforeEach() {
        loader = new FakeLoader();
        dictionary = new LexinDictionary(loader);
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

    "getTranslation": {
        "getTranslation normal"() {
            var dfd = this.async(1000);
            loader.data = [swe_rus_translation_multi];
            var translation = dictionary.getTranslation("författare", "swe_rus", TranslationDirection.to);
            return translation.done((data) => {
                assert.isTrue(data.length > 0, "getTranslation should return html with translation");
                dfd.resolve();
            });
        },

        "getTranslation lower retry"() {
            var dfd = this.async(1000);
            loader.data = ["Författare - Ingen träff", swe_rus_translation_multi];
            var translation = dictionary.getTranslation("Författare", "swe_rus", TranslationDirection.to);
            assert.equal(loader.urls.length, 2);
            assert.equal(loader.urls[0], "http://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,F%C3%B6rfattare");
            assert.equal(loader.urls[1], "http://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_rus,f%C3%B6rfattare");
            return translation.done((data) => {
                assert.isTrue(data.length > 0, "getTranslation should return html with translation");
                dfd.resolve();
            });
        }

    },

    "parse"() {
        var history = dictionary.parseTranslation(swe_rus_translation_multi, "swe_rus");

        assert.equal(history.length, 7);
        assert.equal(history[0].word, "författare");    assert.equal(history[0].translation, "писатель");
        assert.equal(history[1].word, "bestseller");    assert.equal(history[1].translation, "бестселлер");
        assert.equal(history[2].word, "memoarer");      assert.equal(history[2].translation, "мемуары");
        assert.equal(history[3].word, "ordbok");        assert.equal(history[3].translation, "словарь");
        assert.equal(history[4].word, "pjäs");          assert.equal(history[4].translation, "пьеса");
        assert.equal(history[5].word, "roman");         assert.equal(history[5].translation, "роман");
        assert.equal(history[6].word, "succé");         assert.equal(history[6].translation, "успех");
    }

});

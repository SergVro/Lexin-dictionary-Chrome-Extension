/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryBase = require("src/scripts/Dictionary/DictionaryBase");
import TranslationDirection = require("src/scripts/Dictionary/TranslationDirection");

var dictionary: DictionaryBase;

registerSuite({
    name: "DictionaryBase",

    beforeEach() {
        dictionary = new DictionaryBase($);
    },

    "htmlDecode"() {
        assert.equal(dictionary.htmlDecode("Ingen unik tr&auml;ff"), "Ingen unik träff",
            "htmlDecode should replace html encoded symbols");
    },

    isWordFound() {
        assert.throw(() => dictionary.isWordFound("test", "foo"), "This method is abstract");
    },

    createQueryUrl() {
        assert.throw(() => dictionary.createQueryUrl("test", "swe_foo", TranslationDirection.to), "This method is abstract");
    },

    checkLanguage() {
        assert.throw(() => dictionary.checkLanguage("swe_foo"), "This dictionary does not support language swe_foo");
    }
});

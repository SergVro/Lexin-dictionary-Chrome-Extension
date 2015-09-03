/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryBase = require("src/scripts/Dictionaries/DictionaryBase");

var dictionary: DictionaryBase;

registerSuite({
    name: "DictionaryBase",

    beforeEach() {
        dictionary = new DictionaryBase();
    },

    "htmlDecode"() {
        assert.equal(dictionary.htmlDecode("Ingen unik tr&auml;ff"), "Ingen unik träff",
            "htmlDecode should replace html encoded symbols");
    }
});

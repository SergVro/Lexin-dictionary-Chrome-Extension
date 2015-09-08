/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryFactory = require("src/scripts/Dictionary/DictionaryFactory");
import LanguageManager = require("src/scripts/LanguageManager");

import interfaces = require("src/scripts/Interfaces");
import ILanguage = interfaces.ILanguage;
import ISettingsStorage = interfaces.ISettingsStorage;

var mockSettingsStorage: ISettingsStorage,
    dictionaryFactory: DictionaryFactory,
    languageManager: LanguageManager;

registerSuite({
    name: "LanguageManager",

    beforeEach() {
        mockSettingsStorage = {};
        dictionaryFactory = new DictionaryFactory();
        languageManager = new LanguageManager(mockSettingsStorage, dictionaryFactory);
    },
    // Assume we have a promises interface defined
    "getLanguages"() {
        var languages = languageManager.getLanguages();
        assert.strictEqual(languages.length, 20, "getLanguages should return list of 20 languages");
    },

    "enabled languages": {
        "setEnabledLanguages"() {
            var languages = languageManager.getLanguages(),
                enabledLanguages = [
                    languageManager.getLanguage("swe_rus"),
                    languageManager.getLanguage("swe_eng"),
                    languageManager.getLanguage("swe_swe")
                ];

            languageManager.setEnabledLanguages(enabledLanguages);
            assert.sameMembers(enabledLanguages, languageManager.getEnabledLanguages(),
                "setEnabledLanguages should set the list of enabled languages");
        },

        "setEnabledByValue"() {
            languageManager.setEnabledByValues(["swe_eng", "swe_rus"]);
            assert.isTrue(languageManager.isEnabled("swe_eng"));
            assert.isTrue(languageManager.isEnabled("swe_rus"));
        },

        "setEnabledByValue invalid"() {
            assert.throw(() => languageManager.setEnabledByValues(["swe_eng", "swe_rus", "swe_xxx"]),
                "swe_xxx is not a valid language value");
        },

        "getEnabledLanguages"() {
            var myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            languageManager.currentLanguage = "swe_eng";
            languageManager.setEnabledLanguages(myEnabledLanguages);
            assert.deepEqual(myEnabledLanguages, languageManager.getEnabledLanguages());
        },

        "getEnabledLanguages default"() {
            assert.deepEqual(languageManager.getLanguages(), languageManager.getEnabledLanguages());
        },

        "isEnabled"() {
            var myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            languageManager.currentLanguage = "swe_rus";
            languageManager.setEnabledLanguages(myEnabledLanguages);
            assert.isTrue(languageManager.isEnabled("swe_eng"));
            assert.isTrue(languageManager.isEnabled("swe_rus"));
            assert.isFalse(languageManager.isEnabled("swe_swe"));
        },

        "setEnabled"() {
            languageManager.setEnabledLanguages([]);
            languageManager.setEnabled("swe_eng");
            assert.isTrue(languageManager.isEnabled("swe_eng"));
        },

        "setDisabled"() {
            languageManager.setEnabledLanguages([]);
            languageManager.setEnabled("swe_eng");
            languageManager.setDisabled("swe_eng");
            assert.isFalse(languageManager.isEnabled("swe_eng"));
        },

        "setEnabled already"() {
            var myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            languageManager.currentLanguage = "swe_rus";
            languageManager.setEnabledLanguages(myEnabledLanguages);
            languageManager.setEnabled("swe_eng");
            assert.isTrue(languageManager.isEnabled("swe_eng"));
        }

    },

    "getLanguage": {
        "getLangauge valid language"() {
            var lang = languageManager.getLanguage("swe_swe");
            assert.strictEqual(lang.text, "Swedish", "getLanguageName for swe_swe should return Swedish");
        },

        "getLangauge invalid language"() {
            assert.throw(() => languageManager.getLanguage("swe_xyz"), "swe_xyz is not a valid language value");
        }
    },
    "currentLanguage": {
        "setCurrentLanguage valid"() {
            languageManager.currentLanguage = "swe_eng";
            assert.strictEqual(languageManager.currentLanguage, "swe_eng");
        },

        "setCurrentLanguage invalid"() {
            assert.throw(() => languageManager.currentLanguage = "swe_aaa", "swe_aaa is not a valid language value");
        }
    }
});

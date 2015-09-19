/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

import DictionaryFactory = require("src/scripts/Dictionary/DictionaryFactory");
import LanguageManager = require("src/scripts/LanguageManager");

import interfaces = require("src/scripts/Interfaces");
import ILanguage = interfaces.ILanguage;
import ISettingsStorage = interfaces.ISettingsStorage;
import fakes = require("./util/fakes");
//import LocalStorage = require("src/scripts/Storage/LocalStorage");
import FakeAsyncStorage = fakes.FakeAsyncStorage;

var mockSettingsStorage: ISettingsStorage,
    dictionaryFactory: DictionaryFactory,
    languageManager: LanguageManager;

registerSuite({
    name: "LanguageManager",

    beforeEach() {
        mockSettingsStorage = new FakeAsyncStorage();
        localStorage.clear();
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
            return languageManager.getEnabledLanguages().then((el) => {
                assert.sameMembers(enabledLanguages, el,
                    "setEnabledLanguages should set the list of enabled languages");
            });
        },

        "setEnabledByValue"() {
            return languageManager.setEnabledByValues(["swe_eng", "swe_rus"]).then(() => {
                return $.when(
                    languageManager.isEnabled("swe_eng").then((enabled) => assert.isTrue(enabled)),
                    languageManager.isEnabled("swe_rus").then((enabled) => assert.isTrue(enabled))
                );
            });

        },

        "setEnabledByValue invalid"() {
            assert.throw(() => languageManager.setEnabledByValues(["swe_eng", "swe_rus", "swe_xxx"]),
                "swe_xxx is not a valid language value");
        },

        "getEnabledLanguages"() {
            var myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            return languageManager.setCurrentLanguage("swe_eng").then(() => {
                return languageManager.setEnabledLanguages(myEnabledLanguages).then(() => {
                    return languageManager.getEnabledLanguages().then((enabledLang) => {
                        assert.deepEqual(myEnabledLanguages, enabledLang);
                    });
                });
            });
        },

        "getEnabledLanguages default"() {
            return languageManager.getEnabledLanguages().then((enabledLangs) => {
                assert.deepEqual(languageManager.getLanguages(), enabledLangs);
            });
        },

        "isEnabled"() {
            var myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            return $.when(
                languageManager.setCurrentLanguage("swe_rus"),
                languageManager.setEnabledLanguages(myEnabledLanguages)
            ).then(() => {
                    return $.when(
                        languageManager.isEnabled("swe_eng"),
                        languageManager.isEnabled("swe_rus"),
                        languageManager.isEnabled("swe_swe")
                    ).then((swe_eng, swe_rus, swe_swe) => {
                        assert.isTrue(swe_eng);
                        assert.isTrue(swe_rus);
                        assert.isFalse(swe_swe);
                    });
            });


        },

        "setEnabled"() {
            return $.when(
                languageManager.setEnabledLanguages([]),
                languageManager.setEnabled("swe_eng")
            ).then(() => {
                return languageManager.isEnabled("swe_eng").then((enabled) => {
                    assert.isTrue(enabled);
                });
            });

        },

        "setDisabled"() {
            return $.when(
                languageManager.setEnabledLanguages([]),
                languageManager.setEnabled("swe_eng"),
                languageManager.setDisabled("swe_eng")
            ).then(() => {
                return languageManager.isEnabled("swe_eng").then((enabled) => {
                    assert.isFalse(enabled);
                });
            });
        },

        "setEnabled already"() {
            var myEnabledLanguages: ILanguage[] = [{text: "English", value: "swe_eng"}];

            return $.when(
                languageManager.setCurrentLanguage("swe_rus"),
                languageManager.setEnabledLanguages(myEnabledLanguages),
                languageManager.setEnabled("swe_eng")
            ).then(() => {
                return languageManager.isEnabled("swe_eng").then((enabled) => {
                    assert.isTrue(enabled);
                });
            });
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
            return languageManager.setCurrentLanguage("swe_eng").then(() => {
                return languageManager.getCurrentLanguage().then((lang) => {
                    assert.strictEqual(lang, "swe_eng");
                });
            });

        },

        "setCurrentLanguage invalid"() {
            assert.throw(() => languageManager.setCurrentLanguage("swe_aaa"), "swe_aaa is not a valid language value");
        }
    }
});

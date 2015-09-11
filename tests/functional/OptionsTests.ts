
/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />
/// <reference path="..\..\src\lib\requirejs\require.d.ts" />
/// <reference path="..\..\node_modules\intern\typings\leadfoot\leadfoot.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");

registerSuite({
    name: "Options page",

    beforeEach() {
        this.remote.clearLocalStorage();
    },

    "All languages shoudl be in options"() {

        return this.remote
            .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
            .setFindTimeout(1000)

            .findById("swe_alb")
            .end()

            .findById("swe_alb")
            .end()

            .findById("swe_ara")
            .end()

            .findById("swe_azj")
            .end()

            .findById("swe_bos")
            .end()

            .findById("swe_hrv")
            .end()

            .findById("swe_fin")
            .end()

            .findById("swe_gre")
            .end()

            .findById("swe_kmr")
            .end()

            .findById("swe_pus")
            .end()

            .findById("swe_per")
            .end()

            .findById("swe_rus")
            .end()

            .findById("swe_srp")
            .end()

            .findById("swe_srp_cyrillic")
            .end()

            .findById("swe_som")
            .end()

            .findById("swe_sdh")
            .end()

            .findById("swe_spa")
            .end()

            .findById("swe_swe")
            .end()

            .findById("swe_tur")
            .end()

            .findById("swe_eng")
            .end();

    },

    "Change language - options saved"() {

        return this.remote
            .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
            .setFindTimeout(1000)
            .findById("swe_rus")
            .click()
            .end()

            .findById("status")
            .getVisibleText()
            .then((text) => {
                assert.equal(text, "Options saved");
            })
            .end()

            .findById("enabled_swe_rus")
            .isSelected()
            .then((selected) => assert.isTrue(selected))
            .isEnabled((enabled) => assert.isFalse(enabled))
            .end();

    },

    "Disable all"() {
        return this.remote
            .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
            .setFindTimeout(1000)

            .findById("swe_swe")
            .isSelected()
            .then((selected) => assert.isTrue(selected))
            .end()

            .findById("checkAll")
            .click()
            .end()

            .findById("status")
            .getVisibleText()
            .then((text) =>  assert.equal(text, "Options saved"))
            .end()

            .findById("enabled_swe_swe")
            .isSelected()
            .then((selected) => assert.isTrue(selected))
            .isEnabled()
            .then((enabled) => assert.isFalse(enabled))
            .end()

            .findById("enabled_swe_rus")
            .isSelected()
            .then((selected) => assert.isFalse(selected))
            .isEnabled()
            .then((enabled) => assert.isTrue(enabled))
            .end();
    },

    "Enable language"() {
        return this.remote
            .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
            .setFindTimeout(1000)

            .findById("checkAll")
            .click()
            .end()

            .findById("enabled_swe_rus")
            .click()
            .isSelected()
            .then((selected) => assert.isTrue(selected))
            .end()

            .findById("status")
            .getVisibleText()
            .then((text) => {
                assert.equal(text, "Options saved");
            })
            .end();
    }

});


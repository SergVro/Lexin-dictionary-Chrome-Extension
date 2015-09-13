define([
        "intern!object",
        "intern/chai!assert"
    ], function(
        registerSuite,
        assert
    ) {

    registerSuite({
        name: "Options page",

        afterEach: function () {
            return this.remote.clearLocalStorage();
        },

        "All languages should be in options": function () {

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

        "Change language - options saved": function () {

            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
                .setFindTimeout(1000)
                .findById("swe_rus")
                .click()
                .end()

                .findById("status")
                .getVisibleText()
                .then(function (text) {
                    assert.equal(text, "Options saved");
                })
                .end()

                .findById("enabled_swe_rus")
                .isSelected()
                .then(function (selected) {
                    assert.isTrue(selected, "New selected language should be enabled")
                })
                .isEnabled(function (enabled) {
                    assert.isFalse(enabled, "It should not be possible to disabled selected language")
                })
                .end()

                // leave enabled the language we switched from
                .findById("enabled_swe_swe")
                .isSelected()
                .then(function(selected) {
                    assert.isTrue(selected, "The language that was previously selected should remain enabled");
                });

        },

        "Disable all": function () {
            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
                .setFindTimeout(1000)

                .findById("swe_swe")
                .isSelected()
                .then(function (selected) {
                    assert.isTrue(selected)
                })
                .end()

                .findById("checkAll")
                .click()
                .end()

                .findById("status")
                .getVisibleText()
                .then(function (text) {
                    assert.equal(text, "Options saved")
                })
                .end()

                .findById("enabled_swe_swe")
                .isSelected()
                .then(function (selected) {
                    assert.isTrue(selected)
                })
                .isEnabled()
                .then(function (enabled) {
                    assert.isFalse(enabled)
                })
                .end()

                .findById("enabled_swe_rus")
                .isSelected()
                .then(function (selected) {
                    assert.isFalse(selected)
                })
                .isEnabled()
                .then(function (enabled) {
                    assert.isTrue(enabled)
                })
                .end();
        },

        "Enable language": function () {
            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
                .setFindTimeout(1000)

                .findById("checkAll")
                .click()
                .end()

                .findById("enabled_swe_rus")
                .click()
                .isSelected()
                .then(function (selected) {
                    assert.isTrue(selected)
                })
                .end()

                .findById("status")
                .getVisibleText()
                .then(function (text) {
                    assert.equal(text, "Options saved");
                })
                .end();

        }


    });
});



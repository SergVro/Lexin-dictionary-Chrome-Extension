define([
    "intern!object",
    "intern/chai!assert"
], function(
    registerSuite,
    assert
) {

    registerSuite({
        name: "History page",

        afterEach: function () {
            return this.remote.clearLocalStorage();
        },

        "Default history": function() {
            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/history.html")
                .setFindTimeout(1000)

                .findById("language")
                .getProperty("value")
                .then(function(value) {
                    assert.equal(value, "")
                })
                .end()

                .findById("clearHistory")
                .isEnabled()
                .then(function(enabled) {
                    assert.isFalse(enabled);
                })
                .end()

                .findById("showDate")
                .isEnabled()
                .then(function(enabled) {
                    assert.isFalse(enabled)
                })
                .end();


        },

        "Language in options active in history": function () {

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

                .findByCssSelector("#HistoryMenu a")
                .click()
                .end()

                .findById("language")
                .getProperty("value")
                .then(function(value) {
                    assert.equal(value, "swe_rus")
                })
                .end()

        },



    });
});



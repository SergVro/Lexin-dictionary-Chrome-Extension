define([
    "intern!object",
    "intern/chai!assert"
], function(
    registerSuite,
    assert
) {

    registerSuite({
        name: "Pop-up",

        afterEach: function () {
            return this.remote.clearLocalStorage();
        },

        "Type word sv to sv in popup": function() {
            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/popup.html")
                .setFindTimeout(1000)

                .findById("wordInput")
                .type("skatt")
                .end()

                .findByCssSelector("#translation.loaded")
                .getVisibleText()
                .then(function(text) {
                    assert.isTrue(text.indexOf("skatt") > -1);
                    assert.isTrue(text.indexOf("skatten") > -1);
                    assert.isTrue(text.indexOf("skatter") > -1);
                })
                .end()

        },


        "Change language type word sv to rus in popup": function() {
            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/popup.html")
                .setFindTimeout(1000)

                .findById("language")
                .click()
                .end()

                .findByXpath("//option[@value='swe_rus']")
                .click()
                .end()

                .findById("wordInput")
                .type("skatt")
                .end()

                .findByCssSelector("#translation.loaded")
                .getVisibleText()
                .then(function(text) {
                    assert.isTrue(text.indexOf("skatt") > -1);
                    assert.isTrue(text.indexOf("налог") > -1);
                })
                .end()

        },

        "Change language type word rus to sv in popup": function() {
            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/popup.html")
                .setFindTimeout(1000)

                .findById("language")
                .getProperty("value")
                .then(function(value) { assert.equal(value, "swe_swe")})
                .click()
                .end()

                .findByXpath("//option[@value='swe_rus']")
                .click()
                .end()

                .findById("fromWordInput")
                .type("налог")
                .end()

                .findByCssSelector("#translation.loaded")
                .getVisibleText()
                .then(function(text) {
                    assert.isTrue(text.indexOf("skatt") > -1);
                    assert.isTrue(text.indexOf("налог") > -1);
                })
                .end()

        },

        "Change language, Type word, Check history": function() {

            return this.remote
                .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/popup.html")
                .setFindTimeout(1000)

                .findById("language")
                .getProperty("value")
                .then(function(value) { assert.equal(value, "swe_swe")})
                .click()
                .end()

                .findByXpath("//option[@value='swe_rus']")
                .click()
                .end()

                .findById("fromWordInput")
                .type("налог")
                .end()

                .findByCssSelector("#translation.loaded")
                .getVisibleText()
                .then(function(text) {
                    assert.isTrue(text.indexOf("skatt") > -1);
                    assert.isTrue(text.indexOf("налог") > -1);
                })
                .end()

                .findById("historyLink") // this opens new tab
                .click()
                .end()

                .getAllWindowHandles()
                .then(function(handles) {
                    return this.parent.switchToWindow(handles[1]);
                })
                .end()

                .findById("history")
                    .findByXpath("//table/tbody/tr/td[1]")
                    .getVisibleText()
                    .then(function(text) {
                        assert.equal(text, "skatt");
                    })
                    .end()

                    .findByXpath("//table/tbody/tr/td[2]")
                    .getVisibleText()
                    .then(function(text) {
                        assert.equal(text, "налог");
                    })
                    .end()
                .end()

        }
    });
});



define([
    "intern!object",
    "intern/chai!assert",
    "intern/dojo/node!intern/node_modules/leadfoot/keys"
], function(
    registerSuite,
    assert,
    keys
    ) {
    registerSuite({
        name: "On page translation",

            "show translation for bil": function() {

                return this.remote
                    .get(require.toUrl("tests/functional/data/TestPage.html"))
                    .setFindTimeout(5000)
                    .findByCssSelector("span.bil")
                    .pressKeys(keys.ALT)
                    .doubleClick()
                    .pressKeys(keys.ALT)
                    .end()

                    .findDisplayedByCssSelector(".lexinTranslationContent.loaded")
                    .getVisibleText()
                    .then(function(text) {
                        assert.isTrue(text.indexOf("bil") > -1, "Should find bil");
                        assert.isTrue(text.indexOf("bilen") > -1, "Should find bilen");
                        assert.isTrue(text.indexOf("bilar") > -1, "Should find bilar");
                    });
            },

            "hide translation when clicked outside": function() {

                return this.remote
                    .get(require.toUrl("tests/functional/data/TestPage.html"))
                    .setFindTimeout(5000)
                    .findByCssSelector("span.bil")
                    .pressKeys(keys.ALT)
                    .doubleClick()
                    .pressKeys(keys.ALT)
                    .end()

                    .findDisplayedByCssSelector(".lexinTranslationContent.loaded")
                    .then(
                        function() { assert.ok(true, "Translation appears");},
                        function(error) { assert.fail("", "", "Translation does not appear"); }
                    )
                    .end()

                    .moveMouseTo(500, -100)
                    .click()
                    .findByCssSelector(".lexinTranslationContent")
                    .then(function() { assert.fail("", "", "Translation is not deleted")}, function() { assert.ok(true, "Translation deleted");});
            },

            "change language, translate, view in history, clear history": function() {
                return this.remote
                    .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/options.html")
                    .setFindTimeout(5000)
                    .findById("swe_rus")
                    .click()
                    .end()

                    .get(require.toUrl("tests/functional/data/TestPage.html"))
                    .findByCssSelector("span.bil")
                    .pressKeys(keys.ALT)
                    .doubleClick()
                    .pressKeys(keys.ALT)
                    .end()

                    .findDisplayedByCssSelector(".lexinTranslationContent.loaded")
                    .then(
                        function() { assert.ok(true, "Translation appears");},
                        function(error) { assert.fail("", "", "Translation does not appear"); }
                    )
                    .end()

                    .get("chrome-extension://jeipbgbikoomhlkkkcjamdbanfhidebd/html/history.html")
                    .findById("clearHistory")
                    .isEnabled()
                    .then(function(enabled) {
                        assert.isTrue(enabled);
                    })
                    .end()

                    .findById("showDate")
                    .isEnabled()
                    .then(function(enabled) {
                        assert.isTrue(enabled);
                    })
                    .end()

                    .findById("history")
                        .findByXpath("//table/tbody/tr/td[text()='bil']")
                        .end()

                        .findByXpath("//table/tbody/tr/td[text()='автомобиль']")
                        .end()
                    .end()

                    .findById("clearHistory")
                    .click()
                    .acceptAlert()
                    .end()

                    .findAllByCssSelector("#history table tr")
                    .then(function(elements) {
                        assert.equal(elements.length, 1); // only No translations row
                        elements[0].getVisibleText().then(function(text) {
                            assert.equal(text, "No translations in history");
                        })

                    })
                    .end()

            }

    });
});

/// <reference path="../../node_modules/intern/typings/intern/intern.d.ts" />
/// <reference path="..\..\src\lib\requirejs\require.d.ts" />
/// <reference path="..\..\node_modules\intern\typings\leadfoot\leadfoot.d.ts" />

import registerSuite = require("intern!object");
import assert = require("intern/chai!assert");
import keys = require("intern/dojo/node!intern/node_modules/leadfoot/keys");

registerSuite({
    name: "On page translation",

    "show translation for bil"() {

        return this.remote
            .get(require.toUrl("tests/functional/TestPage.html"))
            .setFindTimeout(5000)
            .findByCssSelector("span.bil")
            .pressKeys(keys.ALT)
            .doubleClick()
            .pressKeys(keys.ALT)
            .end()
            .findDisplayedByCssSelector(".lexinTranslationContent.loaded")
            .getVisibleText()
            .then((text) => {
                assert.isTrue(text.indexOf("bil") > -1, "Should find bil");
                assert.isTrue(text.indexOf("bilen") > -1, "Should find bilen");
                assert.isTrue(text.indexOf("bilar") > -1, "Should find bilar");
            });
    },

    "hide translation when clicked outside"() {

        return this.remote
            .get(require.toUrl("tests/functional/TestPage.html"))
            .setFindTimeout(5000)
            .findByCssSelector("span.bil")
            .pressKeys(keys.ALT)
            .doubleClick()
            .pressKeys(keys.ALT)
            .end()
            .findDisplayedByCssSelector(".lexinTranslationContent.loaded")
            .then(() => assert.ok(true, "Translation appears"), (error) => assert.fail("", "", "Translation does not appear"))
            .end()
            .moveMouseTo(500, -100)
            .click()
            .findByCssSelector(".lexinTranslationContent")
            .then(() => assert.fail("", "", "Translation is not deleted"), () => assert.ok(true, "Translation deleted"));
    },


});

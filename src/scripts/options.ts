
import OptionsPage = require("./OptionsPage");
import LanguageManager = require("./LanguageManager");
import $ = require("jquery");

$(() => {
    var languageManager = new LanguageManager(localStorage);
    new OptionsPage(languageManager);
});

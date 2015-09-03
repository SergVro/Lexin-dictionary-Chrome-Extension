import DictionaryFactory = require("./DictionaryFactory");
import OptionsPage = require("./OptionsPage");
import LanguageManager = require("./LanguageManager");
import $ = require("jquery");

$(() => {
    var dictionaryFactory = new DictionaryFactory();
    var languageManager = new LanguageManager(localStorage, dictionaryFactory);
    new OptionsPage(languageManager);
});

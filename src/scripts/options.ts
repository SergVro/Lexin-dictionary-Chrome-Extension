import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import OptionsPage = require("./OptionsPage");
import LanguageManager = require("./LanguageManager");
import StorageFactory = require("./Storage/StorageFactory");
import $ = require("jquery");

$(() => {
    var dictionaryFactory = new DictionaryFactory();
    var languageManager = new LanguageManager(StorageFactory.getOptionsStorage(), dictionaryFactory);
    new OptionsPage(languageManager);
});

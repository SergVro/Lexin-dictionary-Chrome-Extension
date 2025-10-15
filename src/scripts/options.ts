import DictionaryFactory from "./Dictionary/DictionaryFactory.js";
import OptionsPage from "./OptionsPage.js";
import LanguageManager from "./LanguageManager.js";
import $ from "jquery";

$(() => {
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(localStorage, dictionaryFactory);
    new OptionsPage(languageManager);
});

import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import OptionsPage from "./OptionsPage.js";
import LanguageManager from "../common/LanguageManager.js";

document.addEventListener("DOMContentLoaded", () => {
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(localStorage, dictionaryFactory);
    new OptionsPage(languageManager);
});

import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import OptionsPage from "./OptionsPage.js";
import LanguageManager from "../common/LanguageManager.js";
import { createChromeStorage } from "../common/ChromeStorageAdapter.js";

document.addEventListener("DOMContentLoaded", () => {
    // Use chrome.storage instead of localStorage to sync with background worker
    const { settingsStorage } = createChromeStorage();
    
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(settingsStorage, dictionaryFactory);
    new OptionsPage(languageManager);
});

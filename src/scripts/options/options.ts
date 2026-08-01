import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import OptionsPage from "./OptionsPage.js";
import LanguageManager from "../common/LanguageManager.js";
import ThemeManager, { applyTheme } from "../common/ThemeManager.js";
import Settings from "../common/Settings.js";
import { createChromeStorage } from "../common/ChromeStorageAdapter.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Use chrome.storage instead of localStorage to sync with background worker
    const { settingsStorage } = createChromeStorage();

    // Resolve the theme before anything renders, so the page does not flash light on
    // a dark desktop.
    const themeManager = new ThemeManager(settingsStorage);
    applyTheme(document.documentElement, await themeManager.getTheme());

    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(settingsStorage, dictionaryFactory);
    new OptionsPage(languageManager, themeManager, new Settings(settingsStorage));
});

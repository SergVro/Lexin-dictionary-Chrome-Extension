import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import MessageService from "../messaging/MessageService.js";
import LanguageManager from "../common/LanguageManager.js";
import LanguageLabel from "../common/LanguageLabel.js";
import ThemeManager, { applyTheme } from "../common/ThemeManager.js";
import HistoryModel from "./HistoryModel.js";
import HistoryPage from "./HistoryPage.js";
import Settings from "../common/Settings.js";
import { createChromeStorage } from "../common/ChromeStorageAdapter.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Use chrome.storage instead of localStorage to sync with background worker
    const { settingsStorage } = createChromeStorage();

    // Resolve the theme before anything renders, so the page does not flash light on
    // a dark desktop.
    const themeManager = new ThemeManager(settingsStorage);
    applyTheme(document.documentElement, await themeManager.getTheme());

    const messageService = new MessageService();
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(settingsStorage, dictionaryFactory);
    const languageLabel = new LanguageLabel(settingsStorage, dictionaryFactory.getAllSupportedLanguages());
    const historyModel = new HistoryModel(messageService, languageManager, new Settings(settingsStorage));
    new HistoryPage(historyModel, languageLabel);
});

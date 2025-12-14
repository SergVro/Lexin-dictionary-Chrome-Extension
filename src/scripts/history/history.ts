import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import MessageService from "../messaging/MessageService.js";
import LanguageManager from "../common/LanguageManager.js";
import HistoryModel from "./HistoryModel.js";
import HistoryPage from "./HistoryPage.js";
import { createChromeStorage } from "../common/ChromeStorageAdapter.js";

document.addEventListener("DOMContentLoaded", () => {
    // Use chrome.storage instead of localStorage to sync with background worker
    const { settingsStorage } = createChromeStorage();
    
    const messageService = new MessageService();
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(settingsStorage, dictionaryFactory);
    const historyModel = new HistoryModel(messageService, languageManager, settingsStorage);
    new HistoryPage(historyModel);
});

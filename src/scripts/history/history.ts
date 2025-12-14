import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import MessageService from "../messaging/MessageService.js";
import LanguageManager from "../common/LanguageManager.js";
import HistoryModel from "./HistoryModel.js";
import HistoryPage from "./HistoryPage.js";

document.addEventListener("DOMContentLoaded", () => {
    const messageService = new MessageService();
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(localStorage, dictionaryFactory);
    const historyModel = new HistoryModel(messageService, languageManager, localStorage);
    new HistoryPage(historyModel);
});

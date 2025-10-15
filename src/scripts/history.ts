import DictionaryFactory from "./Dictionary/DictionaryFactory.js";
import MessageService from "./Messaging/MessageService.js";
import LanguageManager from "./LanguageManager.js";
import HistoryModel from "./HistoryModel.js";
import HistoryPage from "./HistoryPage.js";
import $ from "jquery";


$(function() {
    const messageService = new MessageService();
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(localStorage, dictionaryFactory);
    const historyModel = new HistoryModel(messageService, languageManager, localStorage);
    new HistoryPage(historyModel);
});

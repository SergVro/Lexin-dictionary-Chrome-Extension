import DictionaryFactory from "./Dictionary/DictionaryFactory.js";
import MessageService from "./Messaging/MessageService.js";
import LanguageManager from "./LanguageManager.js";
import PopupPage from "./PopupPage.js";
import $ from "jquery";

$(() => {
    const messageService = new MessageService();
    const dictionaryFactory = new DictionaryFactory();
    const languageManager = new LanguageManager(localStorage, dictionaryFactory);
    new PopupPage(messageService, languageManager);
});

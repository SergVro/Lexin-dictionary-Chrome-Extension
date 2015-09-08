//# sourceURL=popup.js
/// <reference path="..\lib\jquery\jquery.d.ts" />

import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import MessageService = require("./Messaging/MessageService");
import LanguageManager = require("./LanguageManager");
import PopupPage = require("./PopupPage");
import $ = require("jquery");

$(() => {
    var messageService = new MessageService();
    var dictionaryFactory = new DictionaryFactory();
    var languageManager = new LanguageManager(localStorage, dictionaryFactory);
    new PopupPage(messageService, languageManager);
});

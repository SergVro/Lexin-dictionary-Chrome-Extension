//# sourceURL=popup.js
/// <reference path="..\lib\jquery\jquery.d.ts" />

import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import MessageService = require("./Messaging/MessageService");
import LanguageManager = require("./LanguageManager");
import PopupPage = require("./PopupPage");
import StorageFactory = require("./Storage/StorageFactory");
import $ = require("jquery");

$(() => {
    var messageService = new MessageService();
    var dictionaryFactory = new DictionaryFactory();
    var languageManager = new LanguageManager(StorageFactory.getOptionsStorage(), dictionaryFactory);
    new PopupPage(messageService, languageManager, StorageFactory.getOptionsStorage());
});

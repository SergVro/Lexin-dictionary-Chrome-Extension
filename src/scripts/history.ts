/// <reference path="..\lib\jquery\jquery.d.ts" />

import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import MessageService = require("./Messaging/MessageService");
import LanguageManager = require("./LanguageManager");
import HistoryModel = require("./HistoryModel");
import HistoryPage = require("./HistoryPage");
import StorageFactory = require("./Storage/StorageFactory");
import $ = require("jquery");


$(function() {
    var messageService = new MessageService();
    var dictionaryFactory = new DictionaryFactory();
    var languageManager = new LanguageManager(StorageFactory.getOptionsStorage(), dictionaryFactory);
    var historyModel = new HistoryModel(messageService, languageManager, StorageFactory.getHistoryStorage());
    new HistoryPage(historyModel);
});

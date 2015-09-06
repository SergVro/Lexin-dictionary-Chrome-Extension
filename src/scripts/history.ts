/// <reference path="..\lib\jquery\jquery.d.ts" />

import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import MessageService = require("./MessageService");
import LanguageManager = require("./LanguageManager");
import HistoryModel = require("./HistoryModel");
import HistoryPage = require("./HistoryPage");
import $ = require("jquery");


$(function() {
    var messageService = new MessageService();
    var dictionaryFactory = new DictionaryFactory();
    var languageManager = new LanguageManager(localStorage, dictionaryFactory);
    var historyModel = new HistoryModel(messageService, languageManager, localStorage);
    new HistoryPage(historyModel);
});

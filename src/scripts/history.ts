/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />

import BackendService = require("./BackendService");
import LanguageManager = require("./LanguageManager");
import HistoryModel = require("./HistoryModel");
import HistoryPage = require("./HistoryPage");
import $ = require("jquery");


$(function() {
    var backendService = new BackendService();
    var languageManager = new LanguageManager(localStorage);
    var historyModel = new HistoryModel(backendService, languageManager, localStorage);
    new HistoryPage(historyModel);
});

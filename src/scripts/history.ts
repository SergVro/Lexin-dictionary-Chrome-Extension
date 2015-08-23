/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="common.ts" />
import common = require("common")
import model = require("models")
import page = require("history-page")
import $ = require("jquery")

$(function() {
    var backendService = new common.BackendService();
    var historyModel = new model.HistoryModel(backendService);
    new page.HistoryPage(historyModel);
});

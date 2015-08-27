/// <reference path="..\lib\jquery\jquery.d.ts" />

import BackendService = require("./BackendService");
import LanguageManager = require("./LanguageManager");
import PopupPage = require("./PopupPage");
import $ = require("jquery");

$(() => {
    var backendService = new BackendService();
    var languageManager = new LanguageManager(localStorage);
    new PopupPage(backendService, languageManager);
});

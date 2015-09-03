/// <reference path="..\lib\jquery\jquery.d.ts" />

import DictionaryFactory = require("./DictionaryFactory");
import BackendService = require("./BackendService");
import LanguageManager = require("./LanguageManager");
import PopupPage = require("./PopupPage");
import $ = require("jquery");

$(() => {
    var backendService = new BackendService();
    var dictionaryFactory = new DictionaryFactory();
    var languageManager = new LanguageManager(localStorage, dictionaryFactory);
    new PopupPage(backendService, languageManager);
});

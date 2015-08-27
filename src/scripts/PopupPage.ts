/// <reference path="..\lib\chrome\chrome.d.ts" />

import LinkAdapter = require("./LinkAdapter");
import LanguageManager = require("./LanguageManager");
import interfaces = require("./Interfaces");
import IBackendService = interfaces.IBackendService;
import ITranslation = interfaces.ITranslation;
import $ = require("jquery");

class PopupPage {
    history = [];
    historyIndex = -1;
    currentWord: string;
    private backendService: IBackendService;
    private languageManager: LanguageManager;

    constructor(backendService: IBackendService, languageManager: LanguageManager) {
        this.backendService = backendService;
        this.languageManager = languageManager;

        this.fillLanguages();
        this.getSelectedWord();
        this.currentLanguage = this.languageManager.currentLanguage;

        this.subscribeOnEvents();
    }

    set currentLanguage(value: string) {
        $("#language").val(value);
    }

    get currentLanguage(): string {
        return $("#language").val();
    }

    getTranslation(direction?: string): void {
        var word = $("#word").val();
        word = $.trim(word);
        if (!word || word === "") {
            return;
        }
        var translationBox = $("#translation");
        translationBox.html("Searching for '" + word + "'...");
        this.backendService.getTranslation(word, direction).then((response: ITranslation) => {
            if (word === this.currentWord) {
                translationBox.html(response.translation || response.error);
                LinkAdapter.AdaptLinks(translationBox);
            }
        });
    }

    setCurrentWord(word: string, skipHistory?: boolean, skipInput?: boolean) {
        this.currentWord = word = $.trim(word);
        $("#word").val(word);

        if (!skipInput) {
            $("#wordInput").val(word);
        }
        if (!skipHistory) {
            this.history.push(word);
            this.historyIndex = -1;
        }
    }

    fillLanguages() {
        var languages = this.languageManager.getEnabledLanguages();
        $("#language").empty();
        for (var lang of languages) {
            var option = $("<option></option>").attr("value", lang.value).append(lang.text);
            $("#language").append(option);
        }
    }

    getSelectedWord(): void {
        var self = this;
        chrome.tabs.query({active: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {method: "getSelection"}, function (response) {
                if (response && response.data) {
                    self.setCurrentWord(response.data);
                    self.getTranslation();
                } else {
                    $("#translation").html("No word selected");
                }
            });
        });
    }

    private subscribeOnEvents(): void {

        var self = this;

        $("#language").change(() => {
            this.languageManager.currentLanguage = this.currentLanguage;
            this.getTranslation();
        });

        $("a#historyLink").click(() => {
            chrome.tabs.create({"url": "html/history.html"}, function () {});
            return false;
        });

        // if something was clicked inside the translation article
        $("#translation").click(() => {
            var selection = window.getSelection().toString();
            if (selection !== "") {
                this.setCurrentWord(selection);
                this.getTranslation();
            }
        });

        // manual word search
        var timer = null;
        var wordInput = $("#wordInput");
        wordInput.keyup(function(e){
            if (e.altKey) {
                return;
            }
            clearTimeout(timer);
            var word = $(this).val();
            if (word.length >= 2) {
                timer = setTimeout(() => {
                    self.setCurrentWord(word, false, true);
                    self.getTranslation("to");
                }, 500);
            }
        });

        wordInput[0].focus();

        $("#fromWordInput").keyup(function(e){
            if (e.altKey) {
                return;
            }
            clearTimeout(timer);
            var word = $(this).val();
            if (word.length >= 2) {
                timer = setTimeout(() => {
                    self.setCurrentWord(word, false, true);
                    self.getTranslation("from");
                }, 500);
            }
        });

        $(document).keyup((e) => {
            if (e.ctrlKey) {
                if (e.which === 37) { // left arrow
                    e.preventDefault();
                    if (this.historyIndex < 0) {
                        this.historyIndex = history.length - 1;
                    }
                    if (this.historyIndex === 0) {
                        return;
                    }
                    this.historyIndex--;
                    this.setCurrentWord(history[this.historyIndex], true);
                    this.getTranslation();
                }
                if (e.which === 39) { // right arrow
                    e.preventDefault();
                    if (this.historyIndex === history.length - 1) {
                        this.historyIndex = -1;
                    }
                    if (this.historyIndex < 0) {
                        return;
                    }
                    this.historyIndex++;
                    this.setCurrentWord(history[this.historyIndex], true);
                    this.getTranslation();
                }
            }
        });

        //window.localStorage.setItem("showQuickTip", "Yes");
        var showQuickTip = window.localStorage.getItem("showQuickTip");
        if (showQuickTip !== "No") {
            var tipContainer = $(".quickTipContainer");
            tipContainer.css("display", "block");
            tipContainer.click(function () {
                $(".quickTipContainer").fadeOut("fast", function () {
                    $(".quickTipContainer").css("display", "none");
                });
                window.localStorage.setItem("showQuickTip", "No");
            });
        }
    }
}

export = PopupPage;

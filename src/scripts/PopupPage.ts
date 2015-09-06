/// <reference path="..\lib\google.analytics\ga.d.ts" />

import LinkAdapter = require("./LinkAdapter");
import LanguageManager = require("./LanguageManager");
import TranslationDirection = require("./TranslationDirection");
import interfaces = require("./Interfaces");
import IMessageService = interfaces.IMessageService;
import ITranslation = interfaces.ITranslation;
import $ = require("jquery");

class PopupPage {
    history = [];
    historyIndex = -1;
    currentWord: string;
    private messageService: IMessageService;
    private languageManager: LanguageManager;

    constructor(MessageService: IMessageService, languageManager: LanguageManager) {
        this.messageService = MessageService;
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

    getTranslation(direction?: TranslationDirection): void {
        var word = $("#word").val();
        word = $.trim(word);
        if (!word || word === "") {
            return;
        }
        var translationBox = $("#translation");
        translationBox.html("Searching for '" + word + "'...");
        this.messageService.getTranslation(word, direction).then((response: ITranslation) => {
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
        this.messageService.getSelectedText().done((response) => {
            if (response) {
                this.setCurrentWord(response);
                this.getTranslation();
            } else {
                $("#translation").html("No word selected");
            }
        });
    }

    private subscribeOnEvents(): void {

        var self = this;

        $("#language").change(() => {
            _gaq.push(["_trackEvent", "language", "changed"]);
            this.languageManager.currentLanguage = this.currentLanguage;
            this.getTranslation();
        });

        $("a#historyLink").click(() => {
            _gaq.push(["_trackEvent", "history", "clicked"]);
            this.messageService.createNewTab("html/history.html");
            return false;
        });

        // if something was clicked inside the translation article
        $("#translation").click(() => {
            _gaq.push(["_trackEvent", "translation", "clicked"]);
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
                    _gaq.push(["_trackEvent", "word_from_sv", "typed"]);
                    self.setCurrentWord(word, false, true);
                    self.getTranslation(TranslationDirection.to);
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
                    _gaq.push(["_trackEvent", "word_to_sv", "typed"]);
                    self.setCurrentWord(word, false, true);
                    self.getTranslation(TranslationDirection.from);
                }, 500);
            }
        });

        $(document).keyup((e) => { // TODO: Fix me?
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

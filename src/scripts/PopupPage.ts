import LinkAdapter from "./LinkAdapter.js";
import LanguageManager from "./LanguageManager.js";
import TranslationDirection from "./Dictionary/TranslationDirection.js";
import { IMessageService, ITranslation } from "./Interfaces.js";
import Tracker from "./Tracker.js";
import $ from "jquery";

class PopupPage {
    private history = [];
    private historyIndex = -1;
    private currentWord: string;
    private messageService: IMessageService;
    private languageManager: LanguageManager;

    constructor(MessageService: IMessageService, languageManager: LanguageManager) {
        this.messageService = MessageService;
        this.languageManager = languageManager;

        this.fillLanguages();
        this.translateSelectedWord();
        this.currentLanguage = this.languageManager.currentLanguage;

        this.subscribeOnEvents();
    }

    set currentLanguage(value: string) {
        $("#language").val(value);
    }

    get currentLanguage(): string {
        return $("#language").val() as string;
    }

    getTranslation(direction?: TranslationDirection): void {
        let word = $("#word").val() as string;
        word = $.trim(word);
        if (!word || word === "") {
            return;
        }
        const translationBox = $("#translation");
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
        const languages = this.languageManager.getEnabledLanguages();
        $("#language").empty();
        for (const lang of languages) {
            const option = $("<option></option>").attr("value", lang.value).append(lang.text);
            $("#language").append(option);
        }
    }

    translateSelectedWord(): void {
        this.messageService.getSelectedText().then((response) => {
            if (response) {
                this.setCurrentWord(response);
                this.getTranslation();

                Tracker.track("translation", "popup");
            } else {
                $("#translation").html("No word selected");
            }
        });
    }

    private subscribeOnEvents(): void {

        const self = this;

        $("#language").change(() => {
            Tracker.track("language", "changed", this.currentLanguage);
            this.languageManager.currentLanguage = this.currentLanguage;
            this.getTranslation();
        });

        $("a#historyLink").click(() => {
            Tracker.track("history", "clicked");
            this.messageService.createNewTab("html/history.html");
            return false;
        });

        // if something was clicked inside the translation article
        $("#translation").click(() => {
            Tracker.track("translation", "clicked");
            const selection = window.getSelection().toString();
            if (selection !== "") {
                this.setCurrentWord(selection);
                this.getTranslation();
            }
        });

        // manual word search
        let timer = null;
        const wordInput = $("#wordInput");
        wordInput.keyup(function(e){
            if (e.altKey) {
                return;
            }
            clearTimeout(timer);
            const word = $(this).val() as string;
            if (word.length >= 2) {
                timer = setTimeout(() => {
                    Tracker.track("word", "typed", "from_sv");
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
            const word = $(this).val() as string;
            if (word.length >= 2) {
                timer = setTimeout(() => {
                    Tracker.track("word", "typed", "to_sv");
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
        const showQuickTip = window.localStorage.getItem("showQuickTip");
        if (showQuickTip !== "No") {
            const tipContainer = $(".quickTipContainer");
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

export default PopupPage;

import LinkAdapter from "../common/LinkAdapter.js";
import LanguageManager from "../common/LanguageManager.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";
import { IMessageService, ITranslation } from "../common/Interfaces.js";
import Tracker from "../common/Tracker.js";
import * as DomUtils from "../util/DomUtils.js";
import { fadeOut } from "../util/AnimationUtils.js";

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
        DomUtils.setValue(DomUtils.$("#language"), value);
    }

    get currentLanguage(): string {
        return DomUtils.getValue(DomUtils.$("#language"));
    }

    getTranslation(direction?: TranslationDirection): void {
        let word = DomUtils.getValue(DomUtils.$("#word"));
        word = DomUtils.trim(word);
        if (!word || word === "") {
            return;
        }
        const translationBox = DomUtils.$("#translation") as HTMLElement;
        DomUtils.setHtml(translationBox, "Searching for '" + word + "'...");
        this.messageService.getTranslation(word, direction).then((response: ITranslation) => {
            if (word === this.currentWord) {
                DomUtils.setHtml(translationBox, response.translation || response.error);
                LinkAdapter.AdaptLinks(translationBox);
            }
        });
    }

    setCurrentWord(word: string, skipHistory?: boolean, skipInput?: boolean) {
        this.currentWord = word = DomUtils.trim(word);
        DomUtils.setValue(DomUtils.$("#word"), word);

        if (!skipInput) {
            DomUtils.setValue(DomUtils.$("#wordInput"), word);
        }
        if (!skipHistory) {
            this.history.push(word);
            this.historyIndex = -1;
        }
    }

    fillLanguages() {
        const languages = this.languageManager.getEnabledLanguages();
        const languageSelect = DomUtils.$("#language") as HTMLSelectElement;
        DomUtils.empty(languageSelect);
        for (const lang of languages) {
            const option = DomUtils.createElement("option", { value: lang.value }, lang.text);
            DomUtils.append(languageSelect, option);
        }
    }

    translateSelectedWord(): void {
        this.messageService.getSelectedText().then((response) => {
            if (response) {
                this.setCurrentWord(response);
                this.getTranslation();

                Tracker.track("translation", "popup");
            } else {
                DomUtils.setHtml(DomUtils.$("#translation"), "No word selected");
            }
        });
    }

    private subscribeOnEvents(): void {

        const self = this;

        const languageSelect = DomUtils.$("#language");
        if (languageSelect) {
            languageSelect.addEventListener("change", () => {
                Tracker.track("language", "changed", this.currentLanguage);
                this.languageManager.currentLanguage = this.currentLanguage;
                this.getTranslation();
            });
        }

        const historyLink = DomUtils.$("a#historyLink");
        if (historyLink) {
            historyLink.addEventListener("click", (e) => {
                e.preventDefault();
                Tracker.track("history", "clicked");
                this.messageService.createNewTab("html/history.html");
            });
        }

        // if something was clicked inside the translation article
        const translationBox = DomUtils.$("#translation");
        if (translationBox) {
            translationBox.addEventListener("click", () => {
                Tracker.track("translation", "clicked");
                const selection = window.getSelection()?.toString() || "";
                if (selection !== "") {
                    this.setCurrentWord(selection);
                    this.getTranslation();
                }
            });
        }

        // manual word search
        let timer: ReturnType<typeof setTimeout> | null = null;
        const wordInput = DomUtils.$("#wordInput") as HTMLInputElement;
        if (wordInput) {
            wordInput.addEventListener("keyup", function(e: KeyboardEvent) {
                if (e.altKey) {
                    return;
                }
                if (timer) {
                    clearTimeout(timer);
                }
                const word = (this as HTMLInputElement).value;
                if (word.length >= 2) {
                    timer = setTimeout(() => {
                        Tracker.track("word", "typed", "from_sv");
                        self.setCurrentWord(word, false, true);
                        self.getTranslation(TranslationDirection.to);
                    }, 500);
                }
            });
            wordInput.focus();
        }

        const fromWordInput = DomUtils.$("#fromWordInput") as HTMLInputElement;
        if (fromWordInput) {
            fromWordInput.addEventListener("keyup", function(e: KeyboardEvent) {
                if (e.altKey) {
                    return;
                }
                if (timer) {
                    clearTimeout(timer);
                }
                const word = (this as HTMLInputElement).value;
                if (word.length >= 2) {
                    timer = setTimeout(() => {
                        Tracker.track("word", "typed", "to_sv");
                        self.setCurrentWord(word, false, true);
                        self.getTranslation(TranslationDirection.from);
                    }, 500);
                }
            });
        }

        document.addEventListener("keyup", (e: KeyboardEvent) => {
            if (e.ctrlKey) {
                if (e.key === "ArrowLeft") { // left arrow
                    e.preventDefault();
                    if (this.historyIndex < 0) {
                        this.historyIndex = this.history.length - 1;
                    }
                    if (this.historyIndex === 0) {
                        return;
                    }
                    this.historyIndex--;
                    this.setCurrentWord(this.history[this.historyIndex], true);
                    this.getTranslation();
                }
                if (e.key === "ArrowRight") { // right arrow
                    e.preventDefault();
                    if (this.historyIndex === this.history.length - 1) {
                        this.historyIndex = -1;
                    }
                    if (this.historyIndex < 0) {
                        return;
                    }
                    this.historyIndex++;
                    this.setCurrentWord(this.history[this.historyIndex], true);
                    this.getTranslation();
                }
            }
        });

        //window.localStorage.setItem("showQuickTip", "Yes");
        const showQuickTip = window.localStorage.getItem("showQuickTip");
        if (showQuickTip !== "No") {
            const tipContainer = DomUtils.$(".quickTipContainer") as HTMLElement;
            if (tipContainer) {
                DomUtils.setCss(tipContainer, "display", "block");
                tipContainer.addEventListener("click", function () {
                    fadeOut(tipContainer, 200, () => {
                        DomUtils.setCss(tipContainer, "display", "none");
                    });
                    window.localStorage.setItem("showQuickTip", "No");
                });
            }
        }
    }
}

export default PopupPage;

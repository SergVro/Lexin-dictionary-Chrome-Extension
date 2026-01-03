import LanguageManager from "../common/LanguageManager.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";
import { IMessageService, ITranslation } from "../common/Interfaces.js";
import Tracker from "../common/Tracker.js";
import * as DomUtils from "../util/DomUtils.js";
import { fadeOut } from "../util/AnimationUtils.js";
import { processTranslationHtml } from "../util/TranslationUtils.js";

class PopupPage {
    private history = [];
    private historyIndex = -1;
    private currentWord: string;
    private messageService: IMessageService;
    private languageManager: LanguageManager;
    private currentDirection: TranslationDirection;

    constructor(MessageService: IMessageService, languageManager: LanguageManager) {
        this.messageService = MessageService;
        this.languageManager = languageManager;

        this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.languageManager.waitForInitialization();
        await this.fillLanguages();
        const currentLang = await this.languageManager.getCurrentLanguage();
        this.currentLanguage = currentLang;
        // Restore saved translation direction, default to "to" (Swedish → Language)
        this.currentDirection = await this.getSavedDirection();
        this.translateSelectedWord();

        this.subscribeOnEvents();
        this.setupResponsiveSizing();
    }

    /**
     * Setup responsive popup sizing based on viewport dimensions
     * 
     * Note: Chrome extension popups cannot access browser window dimensions directly.
     * We use screen height as a proxy. Chrome extension popups have a maximum height
     * of 600px enforced by the browser, so we cap at that limit.
     */
    private setupResponsiveSizing(): void {
        const updatePopupSize = () => {
            // Get screen height (closest proxy for browser window size in extension popups)
            // Extension popups don't have direct access to browser window dimensions
            const screenHeight = window.screen?.height || window.innerHeight || 800;

            // Calculate 70% of screen height
            const targetHeight = Math.floor(screenHeight * 0.7);

            // Chrome extension popups have a maximum height of 600px (enforced by browser)
            const maxHeight = Math.min(targetHeight, 600);

            // Set max-height on body to allow popup to expand up to this size
            const body = document.body;
            if (body) {
                // Use CSS custom property for dynamic sizing
                body.style.setProperty("--popup-max-height", `${maxHeight}px`);
                body.style.maxHeight = `${maxHeight}px`;
            }
        };

        // Set initial size after a brief delay to ensure DOM is ready
        setTimeout(updatePopupSize, 0);

        // Update on resize (though popups rarely resize, this handles edge cases)
        window.addEventListener("resize", updatePopupSize);
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
        // Use provided direction, or fall back to saved direction
        const translationDirection = direction || this.currentDirection;
        const translationBox = DomUtils.$("#translation") as HTMLElement;
        DomUtils.setHtml(translationBox, "Searching for '" + word + "'...");
        this.messageService.getTranslation(word, translationDirection).then((response: ITranslation) => {
            if (word === this.currentWord) {
                const html = response.translation || response.error;
                processTranslationHtml(html, translationBox);
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

    async fillLanguages(): Promise<void> {
        const languages = await this.languageManager.getEnabledLanguages();
        const languageSelect = DomUtils.$("#language") as HTMLSelectElement;
        DomUtils.empty(languageSelect);
        for (const lang of languages) {
            const option = DomUtils.createElement("option", { value: lang.value }, lang.text);
            DomUtils.append(languageSelect, option);
        }
    }

    private async setDirection(direction: TranslationDirection): Promise<void> {
        this.currentDirection = direction;
        await this.languageManager.setTranslationDirection(direction);
    }

    private async getSavedDirection(): Promise<TranslationDirection> {
        // Get saved direction from LanguageManager, default to "to" (2)
        const saved = await this.languageManager.getTranslationDirection();
        // TranslationDirection.from = 1, TranslationDirection.to = 2
        return saved === 1 ? TranslationDirection.from : TranslationDirection.to;
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
            languageSelect.addEventListener("change", async () => {
                Tracker.track("language", "changed", this.currentLanguage);
                await this.languageManager.setCurrentLanguage(this.currentLanguage);
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
            wordInput.addEventListener("keyup", function (e: KeyboardEvent) {
                if (e.altKey) {
                    return;
                }
                if (timer) {
                    clearTimeout(timer);
                }
                const word = (this as HTMLInputElement).value;
                if (word.length >= 2) {
                    timer = setTimeout(async () => {
                        Tracker.track("word", "typed", "from_sv");
                        self.setCurrentWord(word, false, true);
                        await self.setDirection(TranslationDirection.to);
                        self.getTranslation(TranslationDirection.to);
                    }, 500);
                }
            });
            wordInput.focus();
        }

        const fromWordInput = DomUtils.$("#fromWordInput") as HTMLInputElement;
        if (fromWordInput) {
            fromWordInput.addEventListener("keyup", function (e: KeyboardEvent) {
                if (e.altKey) {
                    return;
                }
                if (timer) {
                    clearTimeout(timer);
                }
                const word = (this as HTMLInputElement).value;
                if (word.length >= 2) {
                    timer = setTimeout(async () => {
                        Tracker.track("word", "typed", "to_sv");
                        self.setCurrentWord(word, false, true);
                        await self.setDirection(TranslationDirection.from);
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

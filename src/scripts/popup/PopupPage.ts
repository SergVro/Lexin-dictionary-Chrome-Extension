import LanguageManager from "../common/LanguageManager.js";
import LanguageLabel from "../common/LanguageLabel.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";
import { IMessageService, ITranslation } from "../common/Interfaces.js";
import Tracker from "../common/Tracker.js";
import * as DomUtils from "../util/DomUtils.js";
import * as Icons from "../util/Icons.js";
import * as States from "../util/States.js";
import Combobox from "../util/Combobox.js";
import { processTranslationHtml } from "../util/TranslationUtils.js";

/** How many past lookups the Recent row offers. */
const RECENT_COUNT = 5;

/** The lookup fires this long after typing stops. */
const TYPING_DELAY = 500;

class PopupPage {

    /** Every word looked up since the popup opened, for the session nav. */
    private lookups: string[] = [];
    private lookupIndex = -1;
    private currentWord: string = "";
    private currentLanguage: string = "";
    private currentDirection: TranslationDirection;

    private messageService: IMessageService;
    private languageManager: LanguageManager;
    private languageLabel: LanguageLabel;
    private languagePicker: Combobox;

    constructor(MessageService: IMessageService, languageManager: LanguageManager, languageLabel: LanguageLabel) {
        this.messageService = MessageService;
        this.languageManager = languageManager;
        this.languageLabel = languageLabel;

        this.initialize();
    }

    private async initialize(): Promise<void> {
        this.renderIcons();
        this.buildLanguagePicker();

        await this.languageManager.waitForInitialization();
        await this.fillLanguages();
        this.currentLanguage = await this.languageManager.getCurrentLanguage();
        this.languagePicker.value = this.currentLanguage;
        // Restore saved translation direction, default to "to" (Swedish → Language)
        this.currentDirection = await this.getSavedDirection();
        this.renderDirectionBadge();

        this.translateSelectedWord();
        this.refreshRecent();

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
            const screenHeight = window.screen?.height || window.innerHeight || 800;
            const targetHeight = Math.floor(screenHeight * 0.7);
            const maxHeight = Math.min(targetHeight, 600);

            const body = document.body;
            if (body) {
                body.style.setProperty("--popup-max-height", `${maxHeight}px`);
                body.style.maxHeight = `${maxHeight}px`;
            }
        };

        setTimeout(updatePopupSize, 0);
        window.addEventListener("resize", updatePopupSize);
    }

    /** The chrome's icons are inline SVG - the old clock emoji was an icon button. */
    private renderIcons(): void {
        DomUtils.append(DomUtils.$("#optionsLink"), Icons.settings());
        DomUtils.append(DomUtils.$("#swapDirection"), Icons.swap());
        DomUtils.append(DomUtils.$("#historyBack"), Icons.chevronLeft());
        DomUtils.append(DomUtils.$("#historyForward"), Icons.chevronRight());
    }

    private buildLanguagePicker(): void {
        this.languagePicker = new Combobox(
            DomUtils.$("#languagePicker") as HTMLElement, "languageLabel", "Search languages…");
        this.languagePicker.onChange = async (value: string) => {
            this.currentLanguage = value;
            Tracker.track("language", "changed", value);
            await this.languageManager.setCurrentLanguage(value);
            this.renderDirectionBadge();
            this.getTranslation();
            this.refreshRecent();
        };
    }

    async fillLanguages(): Promise<void> {
        const languages = await this.languageManager.getEnabledLanguages();
        this.languagePicker.setOptions(languages);
    }

    /**
     * The badge is the only thing on screen saying which way the lookup runs. Before,
     * that was implied by which of two text fields you happened to type in.
     */
    private renderDirectionBadge(): void {
        const label = this.languageLabel.describeDirection(this.currentLanguage, this.currentDirection);
        DomUtils.setText(DomUtils.$("#directionBadgeText"), label.code);
        DomUtils.setAttr(DomUtils.$("#directionBadge"), "title", label.name);
        DomUtils.setAttr(DomUtils.$("#directionBadge"), "aria-label", label.name);

        // The monolingual Swedish dictionary is not a pair, so there is nothing to
        // swap - and asking it for the "from" direction returns nothing at all.
        const swap = DomUtils.$("#swapDirection") as HTMLButtonElement;
        if (swap) {
            swap.disabled = label.code === "sv";
        }
    }

    getTranslation(direction?: TranslationDirection): void {
        const word = DomUtils.trim(this.currentWord);
        if (!word) {
            return;
        }
        // Use provided direction, or fall back to saved direction
        const translationDirection = direction || this.currentDirection;
        const translationBox = DomUtils.$("#translation") as HTMLElement;
        States.render(translationBox, States.loadingState(word));

        this.messageService.getTranslation(word, translationDirection).then((response: ITranslation) => {
            // A slower earlier lookup must not overwrite a later one's result.
            if (word !== this.currentWord) {
                return;
            }
            if (response.error) {
                States.render(translationBox, States.errorState(response.error));
            } else {
                processTranslationHtml(response.translation || "", translationBox);
            }
            this.refreshRecent();
        }).catch((error) => {
            if (word === this.currentWord) {
                States.render(translationBox, States.errorState(String(error)));
            }
        });
    }

    setCurrentWord(word: string, skipHistory?: boolean, skipInput?: boolean) {
        this.currentWord = word = DomUtils.trim(word);

        if (!skipInput) {
            DomUtils.setValue(DomUtils.$("#wordInput"), word);
        }
        if (!skipHistory) {
            this.lookups.push(word);
            this.lookupIndex = this.lookups.length - 1;
        }
        this.renderSessionNav();
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
                States.render(DomUtils.$("#translation") as HTMLElement, States.emptyState(
                    "No word selected",
                    "Alt + double-click a word on the page, or type above."));
            }
        });
    }

    /**
     * The last few lookups for this Language Direction, as chips.
     *
     * Reads the same per-direction store the History page does - already newest-first,
     * because HistoryManager.getHistory sorts on `added` descending - so nothing new
     * is stored to make this work.
     */
    private async refreshRecent(): Promise<void> {
        if (!this.currentLanguage) {
            return;
        }
        const items = await this.messageService.loadHistory(this.currentLanguage);
        const chips = DomUtils.$("#recentChips") as HTMLElement;
        if (!chips) {
            return;
        }
        DomUtils.empty(chips);

        const recent = (items || []).slice(0, RECENT_COUNT);
        for (const item of recent) {
            const chip = DomUtils.createElement("button",
                { type: "button", title: item.translation }, item.word);
            DomUtils.addClass(chip, "lxChip");
            chip.addEventListener("click", () => {
                this.setCurrentWord(item.word);
                this.getTranslation();
                Tracker.track("recent", "clicked");
            });
            DomUtils.append(chips, chip);
        }

        // Kept even with no recent words: this is the popup's only route to the
        // History page, now that the clock emoji is gone.
        const all = DomUtils.createElement("button", { type: "button" }, "→ All history");
        DomUtils.addClass(all, "lxChip");
        DomUtils.addClass(all, "lxChipAccent");
        all.addEventListener("click", () => {
            Tracker.track("history", "clicked");
            this.messageService.createNewTab("html/history.html");
        });
        DomUtils.append(chips, all);

        const label = DomUtils.$(".lxRecentLabel") as HTMLElement;
        if (recent.length > 0) {
            label.removeAttribute("hidden");
        } else {
            DomUtils.setAttr(label, "hidden", "hidden");
        }
        (DomUtils.$("#recent") as HTMLElement).removeAttribute("hidden");
    }

    /**
     * Ctrl+←/→ has always stepped through the session's lookups with nothing on screen
     * saying so. The buttons appear once there is more than one to step between.
     */
    private renderSessionNav(): void {
        const nav = DomUtils.$("#sessionNav") as HTMLElement;
        const back = DomUtils.$("#historyBack") as HTMLButtonElement;
        const forward = DomUtils.$("#historyForward") as HTMLButtonElement;
        if (!nav || !back || !forward) {
            return;
        }
        if (this.lookups.length > 1) {
            nav.removeAttribute("hidden");
        } else {
            DomUtils.setAttr(nav, "hidden", "hidden");
        }
        back.disabled = this.lookupIndex <= 0;
        forward.disabled = this.lookupIndex >= this.lookups.length - 1;
    }

    private step(delta: number): void {
        const next = this.lookupIndex + delta;
        if (next < 0 || next >= this.lookups.length) {
            return;
        }
        this.lookupIndex = next;
        this.setCurrentWord(this.lookups[next], true);
        this.getTranslation();
    }

    private subscribeOnEvents(): void {

        const self = this;

        DomUtils.$("#optionsLink")?.addEventListener("click", () => {
            Tracker.track("options", "clicked");
            this.messageService.createNewTab("html/options.html");
        });

        DomUtils.$("#swapDirection")?.addEventListener("click", async () => {
            const next = this.currentDirection === TranslationDirection.to
                ? TranslationDirection.from
                : TranslationDirection.to;
            await this.setDirection(next);
            this.renderDirectionBadge();
            Tracker.track("direction", "swapped");
            this.getTranslation();
        });

        DomUtils.$("#historyBack")?.addEventListener("click", () => this.step(-1));
        DomUtils.$("#historyForward")?.addEventListener("click", () => this.step(1));

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

        // manual word search - one field now, with the direction taken from the badge
        // rather than from which of two boxes the reader happened to pick
        let timer: ReturnType<typeof setTimeout> | null = null;
        const wordInput = DomUtils.$("#wordInput") as HTMLInputElement;
        if (wordInput) {
            wordInput.addEventListener("keyup", function (e: KeyboardEvent) {
                if (e.altKey || e.ctrlKey) {
                    return;
                }
                if (timer) {
                    clearTimeout(timer);
                }
                const word = (this as HTMLInputElement).value;
                if (word.length < 2) {
                    return;
                }
                // Enter means "now", not "in half a second".
                const delay = e.key === "Enter" ? 0 : TYPING_DELAY;
                timer = setTimeout(() => {
                    Tracker.track("word", "typed", TranslationDirection[self.currentDirection]);
                    self.setCurrentWord(word, false, true);
                    self.getTranslation();
                }, delay);
            });
            wordInput.focus();
        }

        document.addEventListener("keyup", (e: KeyboardEvent) => {
            if (e.ctrlKey) {
                if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    this.step(-1);
                }
                if (e.key === "ArrowRight") {
                    e.preventDefault();
                    this.step(1);
                }
            }
        });
    }
}

export default PopupPage;

import { IMessageService, IMessageHandlers } from "../common/Interfaces.js";
import * as DomUtils from "../util/DomUtils.js";
import { position } from "../util/PositionUtils.js";
import { processTranslationHtml } from "../util/TranslationUtils.js";
import * as Icons from "../util/Icons.js";
import * as States from "../util/States.js";
import ThemeManager, { applyTheme, Theme } from "../common/ThemeManager.js";
import LanguageLabel, { ILanguageLabel } from "../common/LanguageLabel.js";
import Settings, { LookupModifier } from "../common/Settings.js";
import tokensCss from "../../css/tokens.css";
import componentsCss from "../../css/components.css";
import cardCss from "../../css/card.css";
import translationContentCss from "../../css/translation-content.css";

/**
 * The Translation Card's stylesheet, built once and shared by every card.
 *
 * It is inlined into the bundle rather than linked, because a <link> into a shadow
 * root needs web_accessible_resources - which ManifestTests forbids, and which would
 * leak the extension ID to every page. See
 * docs/adr/0001-shadow-dom-for-translation-card.md.
 */
let cardStyleSheet: CSSStyleSheet | undefined;

function getCardStyleSheet(): CSSStyleSheet {
    if (!cardStyleSheet) {
        cardStyleSheet = new CSSStyleSheet();
        // Tokens first - every other sheet resolves its values from them - then the
        // shared components, then the reset and card chrome, then the shared
        // translation styling. components.css is what puts the card's loading and
        // error states and the Action Popup's on the same footing.
        cardStyleSheet.replaceSync(
            tokensCss + "\n" + componentsCss + "\n" + cardCss + "\n" + translationContentCss);
    }
    return cardStyleSheet;
}

const HOST_CLASS = "lexinExtensionMainContainer";

class ContentScript {

    messageService: IMessageService;
    private messageHandlers: IMessageHandlers;
    private themeManager: ThemeManager;
    private languageLabel: LanguageLabel;
    private settings: Settings;
    private lookupModifier: LookupModifier = "alt";

    /**
     * What the card should say about itself, cached so a card can be built
     * synchronously on click - reading storage first would flash an unthemed card.
     * Refreshed after every card opens, and the open card is corrected in place.
     */
    private theme: Theme = "light";
    private label: ILanguageLabel = { code: "sv", name: "Swedish" };

    private zIndex = 10000;
    private clickedInsideCard = false;

    constructor(MessageService: IMessageService, messageHandlers: IMessageHandlers,
                themeManager: ThemeManager, languageLabel: LanguageLabel, settings: Settings) {
        this.messageService = MessageService;
        this.messageHandlers = messageHandlers;
        this.themeManager = themeManager;
        this.languageLabel = languageLabel;
        this.settings = settings;
    }

    getSelection(): string {
        let selection = window.getSelection()?.toString() || "";
        selection = DomUtils.trim(selection);
        return selection;
    }

    handleGetSelection() {
        this.messageHandlers.registerGetSelectionHandler(() => {
            const selectedText = this.getSelection();
            if (selectedText !== "") {
                // send response only if there is a selected text
                // since content script is loaded for all frames on a page
                // this prevents empty callbacks to popup
                return selectedText;
            }
        });
    }

    /** Dismisses the open card, whether by the close button, Escape, or a click out. */
    private removeCard(): void {
        const host = document.querySelector("." + HOST_CLASS) as HTMLElement;
        if (host) {
            DomUtils.remove(host);
            this.zIndex = 10000;
        }
    }

    private async refreshCardContext(): Promise<void> {
        this.theme = await this.themeManager.getTheme();
        this.label = await this.languageLabel.getCurrent();
    }

    /**
     * The card's own chrome: which word, which Language Direction, and the way out.
     *
     * Both facts are inputs the extension already held when it fired the lookup, so
     * none of this reads the Translation Markup - it renders correctly even for a
     * word the dictionary has no entry for, and survives the provider changing its
     * response wholesale.
     */
    private buildHeader(word: string, container: HTMLElement): HTMLElement {
        const header = DomUtils.createElement("header");
        DomUtils.addClass(header, "lexinCardHeader");

        const wordBlock = DomUtils.createElement("span");
        DomUtils.addClass(wordBlock, "lexinCardWord");

        const flag = Icons.swedishFlag();
        flag.setAttribute("class", "lexinCardFlag");
        DomUtils.append(wordBlock, flag);

        // textContent, not innerHTML: `word` is whatever the reader clicked on
        // someone else's page.
        const wordText = DomUtils.createElement("span", undefined, word);
        DomUtils.append(wordBlock, wordText);

        const pair = DomUtils.createElement("span");
        DomUtils.addClass(pair, "lexinCardPair");
        DomUtils.append(wordBlock, pair);

        DomUtils.append(header, wordBlock);

        const actions = DomUtils.createElement("span");
        DomUtils.addClass(actions, "lexinCardActions");

        const expandButton = this.buildIconButton(Icons.maximize(), "Open this lookup in the Lexin popup");
        expandButton.addEventListener("click", () => {
            this.messageService.openActionPopup();
        });
        DomUtils.append(actions, expandButton);

        const closeButton = this.buildIconButton(Icons.close(), "Close");
        closeButton.addEventListener("click", () => this.removeCard());
        DomUtils.append(actions, closeButton);

        DomUtils.append(header, actions);

        this.applyCardContext(container, pair);
        return header;
    }

    private buildIconButton(icon: SVGElement, label: string): HTMLElement {
        const button = DomUtils.createElement("button", {
            type: "button",
            "aria-label": label,
            title: label
        });
        DomUtils.addClass(button, "lexinCardButton");
        DomUtils.append(button, icon);
        return button;
    }

    /** Writes the cached theme and Language Direction onto an already-built card. */
    private applyCardContext(container: HTMLElement, pair: Element): void {
        applyTheme(container, this.theme);
        DomUtils.setText(pair, "· " + this.label.code);
        DomUtils.setAttr(pair, "title", this.label.name);
        DomUtils.setAttr(pair, "aria-label", this.label.name);
    }

    private showTranslation(selection: string, evt: MouseEvent): void {
        const self = this;
        const absoluteContainer = DomUtils.createElement("div");
        DomUtils.addClass(absoluteContainer, HOST_CLASS);

        // This element is the one part of the card that lives in the page's DOM, so it
        // is the one part the page can style. Neutralise it before anything else.
        //
        // Inline *and* important is the only combination a hostile page cannot outrank:
        // a style attribute beats selector-based author rules, but a page's !important
        // rule beats a normal inline one. `:host { all: initial }` in card.css would not
        // do - declarations targeting the host element beat :host rules.
        //
        // This is not only about inherited properties. Clearing transform/filter/contain
        // matters just as much: any of them on an ancestor would make it the containing
        // block for the card's fixed positioning, and containing blocks propagate through
        // a shadow boundary. `all` deliberately leaves direction and unicode-bidi alone
        // (CSS Cascade L4 3.3), so the card keeps inheriting text direction as it always has.
        absoluteContainer.style.setProperty("all", "initial", "important");

        const shadowRoot = absoluteContainer.attachShadow({ mode: "open" });
        shadowRoot.adoptedStyleSheets = [getCardStyleSheet()];

        // Container doesn't need positioning - child will use fixed positioning
        document.body.appendChild(absoluteContainer);

        const container = DomUtils.createElement("div");
        DomUtils.addClass(container, "lexinTranslationContainer");
        DomUtils.setAttr(container, "role", "region");
        DomUtils.setAttr(container, "aria-label", "Lexin translation");
        DomUtils.setCss(container, "zIndex", (this.zIndex++).toString());
        shadowRoot.appendChild(container);

        container.addEventListener("click", function(_e: MouseEvent) {
            DomUtils.setCss(container, "zIndex", (self.zIndex++).toString());
            self.clickedInsideCard = true;
        });

        const header = this.buildHeader(selection, container);
        container.appendChild(header);

        const translationBlock = DomUtils.createElement("div");
        DomUtils.setAttr(translationBlock, "id", "translation");
        DomUtils.addClass(translationBlock, "lexinTranslationContent");
        DomUtils.setAttr(translationBlock, "aria-live", "polite");
        States.render(translationBlock, States.loadingState(selection));
        container.appendChild(translationBlock);

        // Function to position the container
        const positionContainer = () => {
            position(container, {
                of: evt,
                my: "center+10 bottom-20",
                at: "center top",
                collision: "flipfit"
            });
        };

        // Position initially (even if size is not final). The card grows with its
        // entry now, so the reposition once the entry lands is what keeps it on
        // screen rather than a nicety.
        positionContainer();

        self.messageService.getTranslation(selection).then((response) => {
            if (response.error) {
                States.render(translationBlock, States.errorState(response.error));
                requestAnimationFrame(positionContainer);
            } else {
                processTranslationHtml(response.translation || "", translationBlock, positionContainer);
            }
        }).catch((error) => {
            States.render(translationBlock, States.errorState(String(error)));
            requestAnimationFrame(positionContainer);
        });

        // The reader may have changed language in the Action Popup since this frame
        // last looked. Correct the card in place rather than showing a stale pair.
        const headerPair = container.querySelector(".lexinCardPair");
        this.refreshCardContext().then(() => {
            if (headerPair && headerPair.isConnected) {
                self.applyCardContext(container, headerPair);
            }
        });
    }

    subscribeOnClicks() {
        const self = this;

        // Handle single click with Alt key
        document.addEventListener("click", function (evt: MouseEvent) {
            if (!self.clickedInsideCard) {
                self.removeCard();
            }
            self.clickedInsideCard = false;
            const selection = self.getSelection();
            if (selection && self.isLookupModifierPressed(evt)) {
                self.showTranslation(selection, evt);
            }
        });

        // Keep a keyboard-state fallback because some platforms omit the modifier
        // flag from the synthesized second click in a double-click gesture.
        let modifierKeyDown = false;
        document.addEventListener("keydown", function (e: KeyboardEvent) {
            if (self.isLookupModifierPressed(e)) {
                modifierKeyDown = true;
            }
        });
        document.addEventListener("keyup", function (e: KeyboardEvent) {
            if (!self.isLookupModifierPressed(e)) {
                modifierKeyDown = false;
            }
        });

        document.addEventListener("dblclick", function (evt: MouseEvent) {
            const isModifierPressed = self.isLookupModifierPressed(evt) || modifierKeyDown;

            if (isModifierPressed) {
                // Prevent default double-click behavior (like text selection)
                evt.preventDefault();
                evt.stopPropagation();

                // Get the word at the double-click position
                // First try to get selection (browser may have selected the word)
                let selection = self.getSelection();

                // If no selection, try to get word from the click position
                if (!selection || selection.trim() === "") {
                    const range = document.caretRangeFromPoint?.(evt.clientX, evt.clientY) ||
                                  (document as any).caretPositionFromPoint?.(evt.clientX, evt.clientY);
                    if (range) {
                        const textNode = range.startContainer;
                        if (textNode.nodeType === Node.TEXT_NODE) {
                            const text = textNode.textContent || "";
                            const offset = range.startOffset;
                            // Extract word at cursor position - look for word boundaries
                            const beforeText = text.substring(Math.max(0, offset - 100), offset);
                            const afterText = text.substring(offset, Math.min(text.length, offset + 100));
                            const beforeMatch = beforeText.match(/(\w+)$/);
                            const afterMatch = afterText.match(/^(\w+)/);
                            if (beforeMatch || afterMatch) {
                                selection = (beforeMatch ? beforeMatch[1] : "") + (afterMatch ? afterMatch[1] : "");
                            }
                        }
                    }
                }

                if (selection && selection.trim() !== "") {
                    if (!self.clickedInsideCard) {
                        self.removeCard();
                    }
                    self.clickedInsideCard = false;
                    self.showTranslation(selection.trim(), evt);
                }
            }
        });
    }

    private isLookupModifierPressed(evt: MouseEvent | KeyboardEvent): boolean {
        if (this.lookupModifier === "control") {
            return evt.ctrlKey || evt.getModifierState?.("Control") === true;
        }
        if (this.lookupModifier === "shift") {
            return evt.shiftKey || evt.getModifierState?.("Shift") === true;
        }
        return evt.altKey || evt.getModifierState?.("Alt") === true;
    }

    async refreshLookupModifier(): Promise<void> {
        this.lookupModifier = await this.settings.getLookupModifier();
    }

    /**
     * Escape dismisses the card.
     *
     * The trigger is a modifier gesture, so a reader who summoned the card from the
     * keyboard could previously only get rid of it by clicking somewhere harmless on
     * a page they are only reading.
     */
    private subscribeOnKeyboard(): void {
        document.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                this.removeCard();
            }
        });
    }

    async initialize(): Promise<void> {
        await this.refreshLookupModifier();
        this.handleGetSelection();
        this.subscribeOnClicks();
        this.subscribeOnKeyboard();
        // Warm the cache so the first card of the session is themed and labelled
        // correctly. Deliberately not awaited: a lookup must not wait on storage.
        this.refreshCardContext();
    }
}

export default ContentScript;

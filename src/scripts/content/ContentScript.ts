import { IMessageService, IMessageHandlers } from "../common/Interfaces.js";
import * as DomUtils from "../util/DomUtils.js";
import { position, PositionOptions } from "../util/PositionUtils.js";
import { processTranslationHtml } from "../util/TranslationUtils.js";
import * as Icons from "../util/Icons.js";
import * as States from "../util/States.js";
import ThemeManager, { applyTheme, Theme } from "../common/ThemeManager.js";
import LanguageLabel, { ILanguageLabel } from "../common/LanguageLabel.js";
import Settings from "../common/Settings.js";
import { DEFAULT_TRIGGER, matchesTrigger, TriggerModifier } from "../common/LookupTrigger.js";
import { wordAtPoint } from "./WordAtPoint.js";
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

/** Where a card points: the click that opened it, or the selection a command found. */
type CardAnchor = Pick<PositionOptions, "of" | "fixed">;

class ContentScript {

    messageService: IMessageService;
    private messageHandlers: IMessageHandlers;
    private themeManager: ThemeManager;
    private languageLabel: LanguageLabel;
    private settings: Settings;

    /**
     * What the card should say about itself, cached so a card can be built
     * synchronously on click - reading storage first would flash an unthemed card.
     * Refreshed after every card opens, and the open card is corrected in place.
     */
    private theme: Theme = "light";
    private label: ILanguageLabel = { code: "sv", name: "Swedish" };

    /**
     * The modifier that opens a card, cached for the same reason as the two above:
     * the click handler has to decide synchronously, and awaiting storage inside it
     * would mean deciding after the click had already gone by.
     *
     * Alt until the first read lands, which is what a reader who never opened the
     * Options page has anyway.
     */
    private trigger: TriggerModifier = DEFAULT_TRIGGER;

    private zIndex = 10000;
    private clickedInsideCard = false;

    constructor(MessageService: IMessageService, messageHandlers: IMessageHandlers,
                themeManager: ThemeManager, languageLabel: LanguageLabel,
                settings: Settings) {
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

    /**
     * Opens a card on the selection when the reader presses the keyboard shortcut.
     *
     * Every frame in the tab is asked, because the worker cannot know which one the
     * reader is in, and exactly one should answer. hasFocus alone would not name it -
     * a top document reports true while focus sits inside one of its iframes - and a
     * selection alone would not either, since a frame keeps its selection after focus
     * has moved on. Together they leave one frame: of the focused ancestor chain, at
     * most one holds a live selection.
     */
    handleTranslateSelection(): void {
        this.messageHandlers.registerTranslateSelectionHandler(() => {
            if (!document.hasFocus()) {
                return;
            }
            const selection = this.getSelection();
            if (!selection) {
                return;
            }
            this.removeCard();
            this.showTranslation(selection, this.selectionAnchor());
            return true;
        });
    }

    /**
     * Where a keyboard-summoned card points: the selection itself.
     *
     * A Range's rect is in viewport coordinates, so `fixed` is set explicitly - the
     * mouse paths get that for free by passing a MouseEvent, and this one would
     * otherwise be read as document coordinates and land wrong on a scrolled page.
     * Reducing the rect to its top centre puts the card exactly where a click in the
     * middle of the word would have put it, so the alignment strings mean the same
     * thing on both paths.
     */
    private selectionAnchor(): CardAnchor {
        const selection = window.getSelection();
        const rect = selection && selection.rangeCount > 0
            ? selection.getRangeAt(0).getBoundingClientRect()
            : undefined;

        if (!rect || (rect.width === 0 && rect.height === 0)) {
            // A selection with no geometry, inside a collapsed or hidden node. The
            // card still has to land somewhere the reader will look.
            return { of: { left: window.innerWidth / 2, top: window.innerHeight / 3 }, fixed: true };
        }
        return { of: { left: rect.left + rect.width / 2, top: rect.top }, fixed: true };
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
        await this.refreshTrigger();
    }

    /**
     * Re-reads the trigger. Public because content.ts calls it from a storage
     * subscription: this is the one setting a page cannot afford to pick up lazily,
     * since the reader changes it precisely when no card can be opened to refresh it.
     */
    async refreshTrigger(): Promise<void> {
        this.trigger = await this.settings.getTriggerModifier();
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

    private showTranslation(selection: string, anchor: CardAnchor): void {
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
                ...anchor,
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

    /**
     * Closes the open card unless the click landed inside it.
     *
     * The card lives in an open shadow root, so its own clicks still bubble out to
     * document - the flag set on the card container in showTranslation is how the two
     * are told apart. Nothing here knows or cares what the trigger is, which is the
     * point: the click listener does double duty, and dismissal has to keep working
     * whatever modifier the reader picked.
     */
    private dismissOnClickOut(): void {
        if (!this.clickedInsideCard) {
            this.removeCard();
        }
        this.clickedInsideCard = false;
    }

    subscribeOnClicks() {
        // Stop Shift dragging the selection along behind it.
        //
        // Selection changes happen on mousedown, and Shift+click's whole meaning is
        // "extend the selection from the existing anchor" - so after one lookup the
        // anchor sits on the first word, and the next Shift+click selects everything
        // in between, highlighted across the page. Preventing the default stops that
        // at the source.
        //
        // Only for Shift, deliberately. Alt and Ctrl replace the selection rather than
        // extending it, so they have nothing to fix - and suppressing the default for
        // them would throw away the browser's own double-click word selection, which
        // the dblclick handler below still wants as a fallback for when
        // caretRangeFromPoint cannot answer. Leaving the default alone for the
        // shipped trigger also means Alt behaves exactly as it always has.
        //
        // The cost, for Shift only: a trigger-click no longer focuses what it lands
        // on and cannot start a drag.
        document.addEventListener("mousedown", (evt: MouseEvent) => {
            if (this.trigger === "shift" && matchesTrigger(evt, this.trigger)) {
                evt.preventDefault();
            }
        });

        document.addEventListener("click", (evt: MouseEvent) => {
            // Unconditionally, and before anything else: every click outside an open
            // card closes it, trigger or not.
            this.dismissOnClickOut();

            if (!matchesTrigger(evt, this.trigger)) {
                return;
            }
            // "Translate what I selected." The selection is the source of truth on
            // this path, and the mousedown handler above is what kept it intact long
            // enough to read.
            const selection = this.getSelection();
            if (!selection) {
                return;
            }
            // The gesture is ours now, so do not also let the page have it: Alt+click
            // downloads a link and Ctrl+click opens a background tab, on a word the
            // reader only meant to look up.
            evt.preventDefault();
            this.showTranslation(selection, { of: evt });
        });

        document.addEventListener("dblclick", (evt: MouseEvent) => {
            if (!matchesTrigger(evt, this.trigger)) {
                return;
            }
            evt.preventDefault();
            evt.stopPropagation();

            // "Translate the word I am pointing at." Position is the source of truth
            // here, not the selection: the mousedown handler means the browser never
            // selected the word for us, and reading the selection instead would hand
            // back whatever was left over from the last lookup. getSelection is the
            // fallback only for the case where a page's own scripting put a live
            // selection under the pointer.
            const selection = wordAtPoint(evt.clientX, evt.clientY) || this.getSelection();
            if (!selection) {
                return;
            }
            this.dismissOnClickOut();
            this.showTranslation(DomUtils.trim(selection), { of: evt });
        });
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

    initialize() {
        this.handleGetSelection();
        this.handleTranslateSelection();
        this.subscribeOnClicks();
        this.subscribeOnKeyboard();
        // Warm the cache so the first card of the session is themed and labelled
        // correctly. Deliberately not awaited: a lookup must not wait on storage.
        this.refreshCardContext();
    }
}

export default ContentScript;

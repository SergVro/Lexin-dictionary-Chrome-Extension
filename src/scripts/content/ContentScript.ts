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
import TranslationDirection from "../dictionary/TranslationDirection.js";
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

/**
 * Which way a Translation Card runs its lookup: always out of Swedish.
 *
 * A card answers "what does this word on the page mean", and the page is Swedish -
 * there is no reader gesture that means anything else. The Action Popup is the
 * surface with a direction to choose, and its swap control has no bearing here.
 *
 * Named rather than left to getTranslation's default, because the expand button hands
 * this to the popup along with the word: the popup restores the reader's last swap on
 * open, so a card expanded while it points the other way would otherwise re-run the
 * lookup backwards and show something the card never showed.
 */
const CARD_DIRECTION = TranslationDirection.to;

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
     * has moved on.
     *
     * Nor are the two together enough. Every document on the focused chain reports
     * hasFocus, and each keeps whatever it had selected last - so a reader who
     * selected a word in the page and then another inside an iframe leaves two
     * documents claiming a live selection, and both would open a card and file a
     * history entry. What names a single frame is being the *deepest* focused one:
     * a document whose own activeElement is a frame has handed focus on, and the
     * frame it handed it to is the one that should answer.
     */
    handleTranslateSelection(): void {
        this.messageHandlers.registerTranslateSelectionHandler(() => {
            if (!document.hasFocus() || this.focusIsInAChildFrame()) {
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
     * Whether this document has passed focus down to a frame inside it.
     *
     * `activeElement` is the frame element itself in that case, which is how a
     * document tells "I am focused" from "something inside me is".
     */
    private focusIsInAChildFrame(): boolean {
        const active = document.activeElement;
        return !!active && (active.tagName === "IFRAME" || active.tagName === "FRAME");
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
            // "This lookup", so the whole lookup goes with it - the word and the way
            // the card ran it. The popup used to work both out for itself and could
            // agree with the card on neither: it asked the page what was selected,
            // which under Shift is nothing at all (the card names its word by
            // position), and it ran that in the reader's last saved direction, which
            // may point the opposite way to the card's.
            this.messageService.openActionPopup(word, CARD_DIRECTION);
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
        // A card that opened over text the reader then tried to click through - rather
        // than a click landing cleanly outside it - never reaches dismissOnClickOut,
        // so a new lookup clears any leftover card itself rather than trusting one is
        // never still open.
        this.removeCard();
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

        self.messageService.getTranslation(selection, CARD_DIRECTION).then((response) => {
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
            if (this.selectionIsOurs() && matchesTrigger(evt, this.trigger)) {
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
            // Before anything that might return: once the modifier is held the gesture
            // is the extension's, and the page does not also get it. Every trigger does
            // something to a link - Ctrl+click opens a background tab, Alt+click
            // downloads, Shift+click opens a window - and a reader double-clicking a
            // linked word to look it up would get that on the first click of the pair,
            // before the lookup had decided what the word even was.
            evt.preventDefault();

            // A double-click arrives as click, click, dblclick. The second click
            // carries detail 2, and the word it would look up is the dblclick
            // handler's to name - without this it fires a second, identical lookup,
            // which is a duplicate request and a duplicate history entry.
            if (evt.detail > 1) {
                return;
            }
            // "Translate what I selected." The selection is the source of truth on
            // this path.
            const selection = this.getSelection();
            if (!selection) {
                return;
            }
            // Under a trigger whose selection we suppress, whatever is selected
            // predates the gesture, and this click could as easily be the first half
            // of a double-click aimed somewhere else - which would look up a word the
            // reader chose some time ago and file a history entry for it.
            //
            // Where the click landed is what tells the two apart, and it says so at
            // once: a reader looking their selection up clicks *on* it, and a reader
            // starting a double-click elsewhere does not. Waiting to see whether a
            // double-click follows would mean guessing at an interval the reader
            // configures and Chrome does not expose.
            if (this.selectionIsOurs() && !this.clickLandedInSelection(evt)) {
                return;
            }
            this.showTranslation(selection, { of: evt });
        });

        document.addEventListener("dblclick", (evt: MouseEvent) => {
            if (!matchesTrigger(evt, this.trigger)) {
                return;
            }
            evt.preventDefault();
            evt.stopPropagation();

            const selection = this.wordDoubleClicked(evt);
            if (!selection) {
                return;
            }
            this.dismissOnClickOut();
            this.showTranslation(DomUtils.trim(selection), { of: evt });
        });
    }

    /**
     * "Translate the word I am pointing at."
     *
     * Which of the two ways of naming that word comes first depends on whether the
     * browser was allowed to make the selection.
     *
     * Where it was, its own is the better answer: it spans inline elements, so
     * `in<em>ter</em>net` comes back whole where scanning the one text node under the
     * pointer returns "ter", and its word segmentation knows more about language than
     * a regular expression ever will. A double-click replaces the selection, so what
     * it holds belongs to this gesture.
     *
     * Where we suppressed it, whatever is selected predates the gesture and would be
     * a lookup of the wrong thing - so position is all there is, with the selection
     * not consulted at all.
     */
    private wordDoubleClicked(evt: MouseEvent): string {
        const atPoint = () => wordAtPoint(evt.clientX, evt.clientY, `.${HOST_CLASS}`);
        if (this.selectionIsOurs()) {
            return atPoint();
        }
        // caretRangeFromPoint answers for points inside the viewport only, so the
        // browser's selection is also the fallback when position cannot answer.
        return this.getSelection() || atPoint();
    }

    /**
     * Whether this trigger has the extension, rather than the browser, deciding what
     * is selected.
     *
     * True for Shift alone, whose own meaning is "extend the selection" - the one
     * modifier whose default has to be suppressed. Read by everything that then has
     * to treat the selection as untrustworthy, so the two cannot drift apart.
     */
    private selectionIsOurs(): boolean {
        return this.trigger === "shift";
    }

    /**
     * Whether a click landed on the text that is currently selected.
     *
     * The selection's own rectangles answer it - one per line it covers - so a
     * multi-line selection is handled without any of them having to be reasoned
     * about here.
     */
    private clickLandedInSelection(evt: MouseEvent): boolean {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return false;
        }
        const rects = selection.getRangeAt(0).getClientRects();
        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            if (evt.clientX >= rect.left && evt.clientX <= rect.right
                && evt.clientY >= rect.top && evt.clientY <= rect.bottom) {
                return true;
            }
        }
        return false;
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

import { IHistoryManager, ITranslation, ITranslationManager, IMessageHandlers,
    IAudioPlayer, IMessageBus } from "../common/Interfaces.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";
import MessageType from "../messaging/MessageType.js";
import { TRANSLATE_SELECTION_COMMAND } from "../common/LookupTrigger.js";

class BackgroundWorker {

    private historyManager: IHistoryManager;
    private translationManager: ITranslationManager;
    private messageHandlers: IMessageHandlers;
    private audioPlayer: IAudioPlayer;
    private messageBus: IMessageBus;

    /**
     * The word a Translation Card handed over, waiting for the popup it opened.
     *
     * In memory rather than in storage, because it only has to outlive
     * chrome.action.openPopup(): the popup asks for it as it initialises, a moment
     * after the call the worker is already awake for. A worker evicted inside that
     * moment loses the word and the popup falls back to the selection, which is the
     * same outcome as opening it from the toolbar.
     */
    private pendingLookup = "";

    constructor(historyManager : IHistoryManager, translationManager: ITranslationManager,
                messageHandlers: IMessageHandlers, audioPlayer: IAudioPlayer,
                messageBus: IMessageBus) {
        this.historyManager = historyManager;
        this.translationManager = translationManager;
        this.messageHandlers = messageHandlers;
        this.audioPlayer = audioPlayer;
        this.messageBus = messageBus;
    }

    getTranslation(word: string, direction: TranslationDirection): Promise<ITranslation> {
        return new Promise<ITranslation>((resolve) => {
            this.translationManager.getTranslation(word, direction).then((data) => {
                const response: ITranslation = {translation: data, error: null};
                resolve(response);
            }).catch((error: any) => {
                const errorMessage = "Error connecting to the dictionary service: " +
                    (error && error.status ? error.status : "Unknown");
                const response: ITranslation = {translation: null, error: errorMessage};
                resolve(response);
            });
        });
    }

    /**
     * Opens the Action Popup on behalf of the Translation Card's expand button.
     *
     * The card's word is parked here first, for the popup to collect once it opens.
     * It cannot be passed to the popup directly - nothing can address a document that
     * does not exist yet - and the popup cannot work it out for itself: under the
     * Shift trigger there is deliberately no selection on the page to read.
     *
     * chrome.action.openPopup() is Chrome 127+, and can reject even where it exists
     * (no focused window, or the call arriving too long after the user's click). It
     * degrades to nothing rather than to a fallback: the same page in a tab would ask
     * *itself* for the selection and render "No word selected", which is worse than
     * the card the reader already has open. The parked word is dropped along with it,
     * so a popup opened from the toolbar later is not answered with a stale one.
     */
    async openActionPopup(word: string): Promise<void> {
        this.pendingLookup = word || "";
        try {
            await chrome.action.openPopup();
        } catch (error) {
            this.pendingLookup = "";
            console.warn("Could not open the Action Popup", error);
        }
    }

    /**
     * Hands the parked word to the popup that just opened, and forgets it.
     *
     * Once, by design: the handover belongs to the one popup the expand button opened.
     * Left in place it would answer the next popup too - opened from the toolbar, on a
     * different page - with a word the reader looked up some time ago.
     */
    takePendingLookup(): string {
        const word = this.pendingLookup;
        this.pendingLookup = "";
        return word;
    }

    /**
     * Plays a pronunciation clip on behalf of whichever surface was clicked.
     *
     * The worker is in this path for one reason: only it can open the Offscreen
     * Document where the clip is allowed to load. A Translation Card that played the
     * clip itself would do so under the host page's CSP, which on a site like svt.se
     * blocks it. See docs/adr/0004-offscreen-audio-playback.md.
     */
    playAudio(url: string): Promise<void> {
        return this.audioPlayer.play(url);
    }

    /**
     * Asks the active tab to look up its selection, on the reader's keyboard shortcut.
     *
     * A shortcut is the one trigger no desktop can intercept, which is the whole
     * reason it exists: ChromeOS and GNOME both take Alt+click for themselves before
     * the page is sent anything. Where nothing is selected no frame answers and this
     * quietly does nothing - the same outcome as on a page the content script cannot
     * run on, and better than a panel opening at a keystroke that found no word.
     */
    translateSelection(): Promise<void> {
        return this.messageBus.sendMessageToActiveTab(MessageType.translateSelection)
            .then(() => undefined);
    }

    initialize(): void {
        // Registered synchronously, while the worker is starting: it sleeps between
        // events, and a listener attached later is not there when Chrome wakes it for
        // the keystroke.
        this.messageBus.registerCommandHandler(TRANSLATE_SELECTION_COMMAND,
            () => this.translateSelection());
        this.messageHandlers.registerGetTranslationHandler((word, direction) => this.getTranslation(word, direction));
        this.messageHandlers.registerLoadHistoryHandler((langDirection) => this.historyManager.getHistory(langDirection));
        this.messageHandlers.registerClearHistoryHandler((langDirection) => this.historyManager.clearHistory(langDirection));
        this.messageHandlers.registerLoadHistoryDirectionsHandler(() => this.historyManager.getDirections());
        this.messageHandlers.registerRemoveHistoryItemHandler(
            (langDirection, word, added) => this.historyManager.removeItem(langDirection, word, added));
        this.messageHandlers.registerOpenActionPopupHandler((word) => this.openActionPopup(word));
        this.messageHandlers.registerTakePendingLookupHandler(() => this.takePendingLookup());
        this.messageHandlers.registerPlayAudioHandler((url) => this.playAudio(url));
    }
}

export default BackgroundWorker;

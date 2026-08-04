import { IHistoryManager, ITranslation, ITranslationManager, IMessageHandlers,
    IAudioPlayer } from "../common/Interfaces.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";

class BackgroundWorker {

    private historyManager: IHistoryManager;
    private translationManager: ITranslationManager;
    private messageHandlers: IMessageHandlers;
    private audioPlayer: IAudioPlayer;

    constructor(historyManager : IHistoryManager, translationManager: ITranslationManager,
                messageHandlers: IMessageHandlers, audioPlayer: IAudioPlayer) {
        this.historyManager = historyManager;
        this.translationManager = translationManager;
        this.messageHandlers = messageHandlers;
        this.audioPlayer = audioPlayer;
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
     * chrome.action.openPopup() is Chrome 127+, and can reject even where it exists
     * (no focused window, or the call arriving too long after the user's click). It
     * degrades to nothing rather than to a fallback: the same page in a tab would ask
     * *itself* for the selection and render "No word selected", which is worse than
     * the card the reader already has open.
     */
    async openActionPopup(): Promise<void> {
        try {
            await chrome.action.openPopup();
        } catch (error) {
            console.warn("Could not open the Action Popup", error);
        }
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

    initialize(): void {
        this.messageHandlers.registerGetTranslationHandler((word, direction) => this.getTranslation(word, direction));
        this.messageHandlers.registerLoadHistoryHandler((langDirection) => this.historyManager.getHistory(langDirection));
        this.messageHandlers.registerClearHistoryHandler((langDirection) => this.historyManager.clearHistory(langDirection));
        this.messageHandlers.registerLoadHistoryDirectionsHandler(() => this.historyManager.getDirections());
        this.messageHandlers.registerRemoveHistoryItemHandler(
            (langDirection, word, added) => this.historyManager.removeItem(langDirection, word, added));
        this.messageHandlers.registerOpenActionPopupHandler(() => this.openActionPopup());
        this.messageHandlers.registerPlayAudioHandler((url) => this.playAudio(url));
    }
}

export default BackgroundWorker;

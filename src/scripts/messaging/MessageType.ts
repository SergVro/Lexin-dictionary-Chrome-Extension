enum MessageType {
    getHistory,
    clearHistory,
    getTranslation,
    getSelection,
    openActionPopup,
    getHistoryDirections,
    removeHistoryItem,
    /** Any surface -> the service worker: play this pronunciation clip. */
    playAudio,
    /**
     * The service worker -> the Offscreen Document, which is the only context that
     * can both hold an <audio> element and load it free of a web page's CSP.
     *
     * Kept apart from playAudio because chrome.runtime.sendMessage reaches every
     * extension context except the sender: were it one type, a clip played from the
     * Action Popup would arrive at the worker *and* at an already-open Offscreen
     * Document, and the worker's forward would play it a second time.
     */
    playAudioInOffscreenDocument,
    /**
     * The service worker -> every frame of the active tab: open a card on whatever is
     * selected. Sent when the reader presses the extension's keyboard shortcut, which
     * Chrome delivers to the worker and nowhere else.
     */
    translateSelection,
    /**
     * The Action Popup -> the service worker: the word a Translation Card handed over
     * when its expand button opened me, if that is why I am open.
     *
     * Consumed rather than read: the handover belongs to one popup, and a word left
     * behind would open the *next* one - clicked from the toolbar, with something else
     * entirely selected - on a word the reader looked up minutes ago.
     */
    takePendingLookup
}

export default MessageType;


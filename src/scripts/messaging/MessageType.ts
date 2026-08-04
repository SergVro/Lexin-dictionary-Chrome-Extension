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
    playAudioInOffscreenDocument
}

export default MessageType;


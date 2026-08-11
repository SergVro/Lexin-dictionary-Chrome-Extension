import { IMessageService, IHistoryItem, IPendingLookup, ITranslation } from "../common/Interfaces.js";
import MessageType from "./MessageType.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";
import MessageBus from "./MessageBus.js";

class MessageService implements IMessageService{

    loadHistory(language: string) : Promise<IHistoryItem[]> {
        return MessageBus.Instance.sendMessage(MessageType.getHistory, {langDirection: language});
    }

    loadHistoryDirections() : Promise<string[]> {
        return MessageBus.Instance.sendMessage(MessageType.getHistoryDirections);
    }

    clearHistory(language: string) : Promise<void> {
        return MessageBus.Instance.sendMessage(MessageType.clearHistory, {langDirection: language});
    }

    removeHistoryItem(language: string, word: string, added: number) : Promise<void> {
        return MessageBus.Instance.sendMessage(MessageType.removeHistoryItem,
            {langDirection: language, word: word, added: added});
    }

    getTranslation(word: string, direction?: TranslationDirection): Promise<ITranslation> {
        return MessageBus.Instance.sendMessage(MessageType.getTranslation,
            {word: word, direction: direction ? direction : TranslationDirection.to });
    }

    getSelectedText(): Promise<string> {
        // The bus resolves undefined when no frame answered; "no selection" is
        // the string form of that, and keeps this method true to Promise<string>.
        return MessageBus.Instance.sendMessageToActiveTab(MessageType.getSelection)
            .then((selection) => selection ?? "");
    }

    createNewTab(url: string): void {
        MessageBus.Instance.createNewTab(url);
    }

    playAudio(url: string): Promise<void> {
        // Playback lives in the Offscreen Document the worker owns, never in the
        // calling context: a Translation Card renders inside the page, so an <audio>
        // element it created would load the clip under the page's Content Security
        // Policy - and svt.se, to name one, has no media-src for lexin.nada.kth.se.
        // See docs/adr/0004-offscreen-audio-playback.md.
        return MessageBus.Instance.sendMessage(MessageType.playAudio, {url: url});
    }

    /**
     * Sent to every frame of the active tab, because the worker cannot know which one
     * the reader is in. Frames with no selection stay silent, so the bus resolves
     * undefined where nothing was selected anywhere - an ordinary outcome, and the
     * reason nothing here treats it as an error.
     */
    translateSelection(): Promise<void> {
        return MessageBus.Instance.sendMessageToActiveTab(MessageType.translateSelection)
            .then(() => undefined);
    }

    getCommandShortcut(command: string): Promise<string> {
        return MessageBus.Instance.getCommandShortcut(command);
    }

    /**
     * The whole lookup travels with the request, and none of it is left for the popup
     * to work out.
     *
     * The popup's other way in - the toolbar button - has nothing but the page's
     * selection and its own saved settings to go on, and neither is the right source
     * here. Under the Shift trigger the card suppresses the selection outright and
     * names its word by position, so asking the page would answer with nothing, or
     * with whatever the reader happened to have selected before; and the popup's saved
     * direction is the reader's last swap, which may point the opposite way to the
     * card. The card already knows both.
     */
    openActionPopup(word: string, direction: TranslationDirection): Promise<void> {
        // Only the service worker can open the Action Popup, so this is a message
        // rather than a direct call - the Translation Card's expand button runs in a
        // content script, which has no chrome.action.
        return MessageBus.Instance.sendMessage(MessageType.openActionPopup,
            {word: word, direction: direction});
    }

    takePendingLookup(): Promise<IPendingLookup | null> {
        return MessageBus.Instance.sendMessage(MessageType.takePendingLookup)
            .then((pending) => pending ?? null);
    }
}

export default MessageService;

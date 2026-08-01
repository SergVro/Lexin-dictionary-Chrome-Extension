import { IMessageService, IHistoryItem, ITranslation } from "../common/Interfaces.js";
import MessageType from "./MessageType.js";
import TranslationDirection from "../dictionary/TranslationDirection.js";
import MessageBus from "./MessageBus.js";

class MessageService implements IMessageService{

    loadHistory(language: string) : Promise<IHistoryItem[]> {
        return MessageBus.Instance.sendMessage(MessageType.getHistory, {langDirection: language});
    }

    clearHistory(language: string) : Promise<void> {
        return MessageBus.Instance.sendMessage(MessageType.clearHistory, {langDirection: language});
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

    openActionPopup(): Promise<void> {
        // Only the service worker can open the Action Popup, so this is a message
        // rather than a direct call - the Translation Card's expand button runs in a
        // content script, which has no chrome.action.
        return MessageBus.Instance.sendMessage(MessageType.openActionPopup);
    }
}

export default MessageService;

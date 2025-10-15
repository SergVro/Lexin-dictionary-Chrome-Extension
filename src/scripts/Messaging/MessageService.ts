import { IMessageService, IHistoryItem, ITranslation } from "../Interfaces.js";
import MessageType from "./MessageType.js";
import TranslationDirection from "../Dictionary/TranslationDirection.js";
import MessageBus from "./MessageBus.js";

class MessageService implements IMessageService{

    loadHistory(language: string) : JQueryPromise<IHistoryItem[]> {
        return MessageBus.Instance.sendMessage(MessageType.getHistory, {langDirection: language});
    }

    clearHistory(language: string) : JQueryPromise<void> {
        return MessageBus.Instance.sendMessage(MessageType.clearHistory, {langDirection: language});
    }

    getTranslation(word: string, direction?: TranslationDirection): JQueryPromise<ITranslation> {
        return MessageBus.Instance.sendMessage(MessageType.getTranslation,
            {word: word, direction: direction ? direction : TranslationDirection.to });
    }

    getSelectedText(): JQueryPromise<string> {
        return MessageBus.Instance.sendMessageToActiveTab(MessageType.getSelection);
    }

    createNewTab(url: string): void {
        MessageBus.Instance.createNewTab(url);
    }
}

export default MessageService;

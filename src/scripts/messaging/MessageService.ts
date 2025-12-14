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
        return MessageBus.Instance.sendMessageToActiveTab(MessageType.getSelection);
    }

    createNewTab(url: string): void {
        MessageBus.Instance.createNewTab(url);
    }
}

export default MessageService;

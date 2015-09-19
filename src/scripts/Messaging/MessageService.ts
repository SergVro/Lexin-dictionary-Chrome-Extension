//# sourceURL=MessageService.js
/// <reference path="../../lib/jquery/jquery.d.ts" />

import interfaces = require("../Interfaces");
import IMessageService = interfaces.IMessageService;
import ILanguage = interfaces.ILanguage;
import IHistoryItem = interfaces.IHistoryItem;
import ITranslation = interfaces.ITranslation;

import MessageType = require("./MessageType");
import TranslationDirection = require("../Dictionary/TranslationDirection");
import MessageBus = require("./MessageBus");

class MessageService implements IMessageService {

    loadHistory(language: string) : JQueryPromise<IHistoryItem[]> {
        return MessageBus.Instance.sendMessage(MessageType.getHistory, {langDirection: language});
    }

    clearHistory(language: string) : JQueryPromise<{}> {
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

export = MessageService;

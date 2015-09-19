import interfaces = require("../Interfaces");

import IMessageHandlers = interfaces.IMessageHandlers;

import GetTranslationHandler = interfaces.GetTranslationHandler;
import LoadHistoryHandler = interfaces.LoadHistoryHandler;
import ClearHistoryHandler = interfaces.ClearHistoryHandler;
import GetSelectionHandler = interfaces.GetSelectionHandler;

import MessageType = require("./MessageType");
import TranslationDirection = require("../Dictionary/TranslationDirection");
import MessageBus = require("./MessageBus");


class MessageHandlers implements IMessageHandlers {
    registerGetTranslationHandler(handler: GetTranslationHandler): void {
        MessageBus.Instance.registerHandler(MessageType.getTranslation, (args) => {
            return handler(args.word, args.direction);
        });
    }

    registerLoadHistoryHandler(handler: LoadHistoryHandler): void {
        MessageBus.Instance.registerHandler(MessageType.getHistory, (args) => {
            return handler(args.langDirection);
        });
    }

    registerClearHistoryHandler(handler: ClearHistoryHandler): void {
        MessageBus.Instance.registerHandler(MessageType.clearHistory, (args) => {
            handler(args.langDirection);
        });
    }

    registerGetSelectionHandler(handler: GetSelectionHandler): void {
        MessageBus.Instance.registerHandler(MessageType.getSelection, (args) => {
            return handler();
        }, true);
    }
}

export = MessageHandlers;

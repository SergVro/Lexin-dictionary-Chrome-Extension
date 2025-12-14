import { IMessageHandlers, GetTranslationHandler, LoadHistoryHandler, ClearHistoryHandler, GetSelectionHandler } from "../common/Interfaces.js";
import MessageType from "./MessageType.js";
import MessageBus from "./MessageBus.js";


class MessageHandlers implements IMessageHandlers{
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
        MessageBus.Instance.registerHandler(MessageType.clearHistory, (args: any) => {
            handler(args.langDirection);
        });
    }

    registerGetSelectionHandler(handler: GetSelectionHandler): void {
        MessageBus.Instance.registerHandler(MessageType.getSelection, (_args) => {
            return handler();
        }, true);
    }
}

export default MessageHandlers;

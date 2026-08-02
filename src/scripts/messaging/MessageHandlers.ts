import { IMessageHandlers, GetTranslationHandler, LoadHistoryHandler, ClearHistoryHandler,
    GetSelectionHandler, OpenActionPopupHandler, LoadHistoryDirectionsHandler,
    RemoveHistoryItemHandler } from "../common/Interfaces.js";
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
            return handler(args.langDirection);
        });
    }

    registerLoadHistoryDirectionsHandler(handler: LoadHistoryDirectionsHandler): void {
        MessageBus.Instance.registerHandler(MessageType.getHistoryDirections, (_args) => {
            return handler();
        });
    }

    registerRemoveHistoryItemHandler(handler: RemoveHistoryItemHandler): void {
        MessageBus.Instance.registerHandler(MessageType.removeHistoryItem, (args: any) => {
            return handler(args.langDirection, args.word, args.added);
        });
    }

    registerGetSelectionHandler(handler: GetSelectionHandler): void {
        MessageBus.Instance.registerHandler(MessageType.getSelection, (_args) => {
            return handler();
        }, true);
    }

    registerOpenActionPopupHandler(handler: OpenActionPopupHandler): void {
        MessageBus.Instance.registerHandler(MessageType.openActionPopup, (_args) => {
            return handler();
        });
    }
}

export default MessageHandlers;

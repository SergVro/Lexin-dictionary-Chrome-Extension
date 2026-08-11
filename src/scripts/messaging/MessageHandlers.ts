import { IMessageHandlers, GetTranslationHandler, LoadHistoryHandler, ClearHistoryHandler,
    GetSelectionHandler, OpenActionPopupHandler, LoadHistoryDirectionsHandler,
    RemoveHistoryItemHandler, PlayAudioHandler,
    TranslateSelectionHandler, TakePendingLookupHandler } from "../common/Interfaces.js";
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
        MessageBus.Instance.registerHandler(MessageType.openActionPopup, (args: any) => {
            return handler(args.word);
        });
    }

    registerTakePendingLookupHandler(handler: TakePendingLookupHandler): void {
        MessageBus.Instance.registerHandler(MessageType.takePendingLookup, (_args) => {
            return handler();
        });
    }

    registerPlayAudioHandler(handler: PlayAudioHandler): void {
        MessageBus.Instance.registerHandler(MessageType.playAudio, (args: any) => {
            return handler(args.url);
        });
    }

    registerPlayAudioInOffscreenDocumentHandler(handler: PlayAudioHandler): void {
        MessageBus.Instance.registerHandler(MessageType.playAudioInOffscreenDocument, (args: any) => {
            return handler(args.url);
        });
    }

    registerTranslateSelectionHandler(handler: TranslateSelectionHandler): void {
        // ignoreEmptyResult, for the same reason getSelection sets it: every frame on
        // the page is asked and only the one holding the selection answers, so a
        // silent frame must not send an empty response back.
        MessageBus.Instance.registerHandler(MessageType.translateSelection, (_args) => {
            return handler();
        }, true);
    }
}

export default MessageHandlers;

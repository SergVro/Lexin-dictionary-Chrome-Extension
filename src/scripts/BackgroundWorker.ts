import $ from "jquery";
import { IHistoryManager, ITranslation, ITranslationManager, IMessageHandlers } from "./Interfaces.js";
import TranslationDirection from "./Dictionary/TranslationDirection.js";

class BackgroundWorker {

    private historyManager: IHistoryManager;
    private translationManager: ITranslationManager;
    private messageHandlers: IMessageHandlers;

    constructor(historyManager : IHistoryManager, translationManager: ITranslationManager, messageHandlers: IMessageHandlers) {
        this.historyManager = historyManager;
        this.translationManager = translationManager;
        this.messageHandlers = messageHandlers;
    }

    getTranslation(word: string, direction: TranslationDirection): JQueryPromise<ITranslation> {
        const result = $.Deferred<ITranslation>();
        this.translationManager.getTranslation(word, direction).then((data) => {
            const response: ITranslation = {translation: data, error: null};
            result.resolve(response);
        }).fail((error: any) => {
            const errorMessage = "Error connecting to the dictionary service: " +
                (error && error.status ? error.status : "Unknown");
            const response: ITranslation = {translation: null, error: errorMessage};
            result.resolve(response);
        });
        return result.promise();
    }

    initialize(): void {
        this.messageHandlers.registerGetTranslationHandler((word, direction) => this.getTranslation(word, direction));
        this.messageHandlers.registerLoadHistoryHandler((langDirection) => this.historyManager.getHistory(langDirection));
        this.messageHandlers.registerClearHistoryHandler((langDirection) => this.historyManager.clearHistory(langDirection));
    }
}

export default BackgroundWorker;

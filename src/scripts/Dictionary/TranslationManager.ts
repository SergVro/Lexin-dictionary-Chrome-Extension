import $ from "jquery";
import DictionaryFactory from "./DictionaryFactory.js";
import LanguageManager from "../LanguageManager.js";
import Tracker from "../Tracker.js";
import { IHistoryManager } from "../Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";

class TranslationManager {

    historyManager: IHistoryManager;
    dictionaryFactory: DictionaryFactory;
    languageManager: LanguageManager;

    constructor(historyManager : IHistoryManager, dictionaryFactory: DictionaryFactory, languageManager: LanguageManager) {
        this.historyManager = historyManager;
        this.dictionaryFactory = dictionaryFactory;
        this.languageManager = languageManager;

    }

    getTranslation(word: string, direction: TranslationDirection,
                   languageDirection?: string, skipHistory? : boolean): JQueryPromise<string> {
        //  Summary
        //      Returns a translation for the specified word
        const deferred = $.Deferred<string>();
        word = $.trim(word);
        if (!word) {
            deferred.reject("word is required");
            return deferred.promise();
        }
        const langDirection = languageDirection || this.languageManager.currentLanguage;
        const dictionary = this.dictionaryFactory.getDictionary(langDirection);
        dictionary.getTranslation(word, langDirection, direction).done((data) => {
            deferred.resolve(data);

            Tracker.translation(langDirection);
            if (!skipHistory) {
                const translations = dictionary.parseTranslation(data, langDirection);
                this.historyManager.addToHistory(langDirection, translations);
            }
        }).fail((error) => {
            deferred.reject(error);

            Tracker.translationError(langDirection);
        });
        return deferred.promise();
    }
}

export default TranslationManager;

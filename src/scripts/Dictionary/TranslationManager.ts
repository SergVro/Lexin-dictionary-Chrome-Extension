import DictionaryFactory from "./DictionaryFactory.js";
import LanguageManager from "../LanguageManager.js";
import Tracker from "../Tracker.js";
import { IHistoryManager } from "../Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";
import { promiseToJQueryPromise } from "../PromiseAdapter.js";

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
        // Use native Promise instead of jQuery Deferred (jQuery doesn't work in service workers)
        word = word.trim(); // Use native trim instead of $.trim()
        if (!word) {
            const rejectedPromise = Promise.reject<string>("word is required");
            return promiseToJQueryPromise(rejectedPromise);
        }
        
        const langDirection = languageDirection || this.languageManager.currentLanguage;
        const dictionary = this.dictionaryFactory.getDictionary(langDirection);
        
        const promise = new Promise<string>((resolve, reject) => {
            dictionary.getTranslation(word, langDirection, direction).done((data) => {
                resolve(data);
                Tracker.translation(langDirection);
                if (!skipHistory) {
                    const translations = dictionary.parseTranslation(data, langDirection);
                    this.historyManager.addToHistory(langDirection, translations);
                }
            }).fail((error) => {
                reject(error);
                Tracker.translationError(langDirection);
            });
        });
        
        return promiseToJQueryPromise(promise);
    }
}

export default TranslationManager;

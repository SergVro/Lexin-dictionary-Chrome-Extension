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
                   languageDirection?: string, skipHistory? : boolean): Promise<string> {
        //  Summary
        //      Returns a translation for the specified word
        // Use native Promise instead of jQuery Deferred (jQuery doesn't work in service workers)
        word = word.trim(); // Use native trim instead of $.trim()
        if (!word) {
            return Promise.reject<string>("word is required");
        }
        
        const langDirection = languageDirection || this.languageManager.currentLanguage;
        const dictionary = this.dictionaryFactory.getDictionary(langDirection);
        
        return new Promise<string>((resolve, reject) => {
            dictionary.getTranslation(word, langDirection, direction).then((data) => {
                resolve(data);
                Tracker.translation(langDirection);
                if (!skipHistory) {
                    const translations = dictionary.parseTranslation(data, langDirection);
                    this.historyManager.addToHistory(langDirection, translations);
                }
            }).catch((error) => {
                reject(error);
                Tracker.translationError(langDirection);
            });
        });
    }
}

export default TranslationManager;

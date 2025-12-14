import DictionaryFactory from "./DictionaryFactory.js";
import LanguageManager from "../common/LanguageManager.js";
import Tracker from "../common/Tracker.js";
import { IHistoryManager } from "../common/Interfaces.js";
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

    async getTranslation(word: string, direction: TranslationDirection,
                   languageDirection?: string, skipHistory? : boolean): Promise<string> {
        //  Summary
        //      Returns a translation for the specified word
        word = word.trim();
        if (!word) {
            return Promise.reject<string>("word is required");
        }
        
        const langDirection = languageDirection || await this.languageManager.getCurrentLanguage();
        const dictionary = this.dictionaryFactory.getDictionary(langDirection);
        
        try {
            const data = await dictionary.getTranslation(word, langDirection, direction);
            Tracker.translation(langDirection);
            if (!skipHistory) {
                const translations = dictionary.parseTranslation(data, langDirection);
                await this.historyManager.addToHistory(langDirection, translations);
            }
            return data;
        } catch (error) {
            Tracker.translationError(langDirection);
            throw error;
        }
    }
}

export default TranslationManager;

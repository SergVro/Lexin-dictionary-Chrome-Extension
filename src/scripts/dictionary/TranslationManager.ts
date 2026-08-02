import DictionaryFactory from "./DictionaryFactory.js";
import LanguageManager from "../common/LanguageManager.js";
import Settings from "../common/Settings.js";
import { IHistoryManager } from "../common/Interfaces.js";
import TranslationDirection from "./TranslationDirection.js";

class TranslationManager {

    historyManager: IHistoryManager;
    dictionaryFactory: DictionaryFactory;
    languageManager: LanguageManager;
    settings: Settings;

    constructor(historyManager : IHistoryManager, dictionaryFactory: DictionaryFactory,
                languageManager: LanguageManager, settings: Settings) {
        this.historyManager = historyManager;
        this.dictionaryFactory = dictionaryFactory;
        this.languageManager = languageManager;
        this.settings = settings;
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
        
        const data = await dictionary.getTranslation(word, langDirection, direction);
        // skipHistory is the caller's decision for one lookup; the setting is the
        // reader's for all of them. Checked after the request so the translation
        // itself is unaffected either way.
        if (!skipHistory && await this.settings.getRecordHistory()) {
            const translations = dictionary.parseTranslation(data, langDirection);
            await this.historyManager.addToHistory(langDirection, translations);
        }
        return data;
    }
}

export default TranslationManager;

import TranslationParser from "../dictionary/TranslationParser.js";
import DictionaryFactory from "../dictionary/DictionaryFactory.js";
import TranslationManager from "../dictionary/TranslationManager.js";
import HistoryManager from "../history/HistoryManager.js";
import LanguageManager from "../common/LanguageManager.js";
import BackgroundWorker from "./BackgroundWorker.js";
import MessageHandlers from "../messaging/MessageHandlers.js";
import { createChromeStorage } from "../common/ChromeStorageAdapter.js";
import FetchLoader from "../dictionary/FetchLoader.js";
import LexinDictionary from "../dictionary/LexinDictionary.js";
import FolketsDictionary from "../dictionary/FolketsDictionary.js";

// Initialize storage adapters for service worker context
// Service workers don't have access to localStorage, so we use chrome.storage
const { storage, settingsStorage } = createChromeStorage();

// Wait for storage cache to load before initializing
(async () => {
    try {
        // Wait for the storage adapter to load its cache
        await (storage as any).waitForCache();
        
        // Create a FetchLoader for service worker context
        const fetchLoader = new FetchLoader();
        
        // Create dictionaries with FetchLoader
        const dictionaries = [
            new LexinDictionary(fetchLoader),
            new FolketsDictionary(fetchLoader)
        ];
        const dictionaryFactory = new DictionaryFactory(dictionaries);
        
        // Now initialize all components
        const translationParser = new TranslationParser();
        const languageManager = new LanguageManager(settingsStorage, dictionaryFactory);
        const historyManager = new HistoryManager(translationParser, storage);
        const translationManager = new TranslationManager(historyManager, dictionaryFactory, languageManager);
        const messageHandlers = new MessageHandlers();
        const backgroundWorker = new BackgroundWorker(historyManager, translationManager, messageHandlers);
        
        backgroundWorker.initialize();
        
        // eslint-disable-next-line no-console
        console.log("Background worker initialized successfully");
    } catch (error) {
        console.error("Failed to initialize background worker:", error);
    }
})();

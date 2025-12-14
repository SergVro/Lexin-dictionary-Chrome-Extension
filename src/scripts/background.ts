import TranslationParser from "./Dictionary/TranslationParser.js";
import DictionaryFactory from "./Dictionary/DictionaryFactory.js";
import TranslationManager from "./Dictionary/TranslationManager.js";
import HistoryManager from "./HistoryManager.js";
import LanguageManager from "./LanguageManager.js";
import BackgroundWorker from "./BackgroundWorker.js";
import MessageHandlers from "./Messaging/MessageHandlers.js";
import { createChromeStorage } from "./ChromeStorageAdapter.js";
import FetchLoader from "./Dictionary/FetchLoader.js";
import LexinDictionary from "./Dictionary/LexinDictionary.js";
import FolketsDictionary from "./Dictionary/FolketsDictionary.js";

// Initialize storage adapters for service worker context
// Service workers don't have access to localStorage, so we use chrome.storage
const { storage, settingsStorage } = createChromeStorage();

// Wait for storage cache to load before initializing
(async () => {
    try {
        // Wait for the storage adapter to load its cache
        await (storage as any).waitForCache();
        
        // Create a FetchLoader for service worker (jQuery doesn't work in service workers)
        const fetchLoader = new FetchLoader();
        
        // Create dictionaries with FetchLoader instead of jQuery
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

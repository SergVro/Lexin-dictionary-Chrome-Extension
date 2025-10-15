import TranslationParser from "./Dictionary/TranslationParser.js";
import DictionaryFactory from "./Dictionary/DictionaryFactory.js";
import TranslationManager from "./Dictionary/TranslationManager.js";
import HistoryManager from "./HistoryManager.js";
import LanguageManager from "./LanguageManager.js";
import BackgroundWorker from "./BackgroundWorker.js";
import MessageHandlers from "./Messaging/MessageHandlers.js";

const translationParser = new TranslationParser();
const dictionaryFactory = new DictionaryFactory();
const languageManager = new LanguageManager(localStorage, dictionaryFactory);
const historyManager = new HistoryManager(translationParser, localStorage);
const translationManager = new TranslationManager(historyManager, dictionaryFactory, languageManager);
const messageHandlers = new MessageHandlers();
const backgroundWorker = new BackgroundWorker(historyManager, translationManager, messageHandlers);

backgroundWorker.initialize();

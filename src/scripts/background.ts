import TranslationParser = require("./Dictionary/TranslationParser");
import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import TranslationManager = require("./Dictionary/TranslationManager");
import HistoryManager = require("./HistoryManager");
import LanguageManager = require("./LanguageManager");
import BackgroundWorker = require("./BackgroundWorker");
import MessageHandlers = require("./Messaging/MessageHandlers");

var translationParser = new TranslationParser();
var dictionaryFactory = new DictionaryFactory();
var languageManager = new LanguageManager(localStorage, dictionaryFactory);
var historyManager = new HistoryManager(translationParser, localStorage);
var translationManager = new TranslationManager(historyManager, dictionaryFactory, languageManager);
var messageHandlers = new MessageHandlers();
var backgroundWorker = new BackgroundWorker(historyManager, translationManager, messageHandlers);

backgroundWorker.initialize();

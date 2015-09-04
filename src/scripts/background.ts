import TranslationParser = require("./Dictionary/TranslationParser");
import HistoryManager = require("./HistoryManager");
import DictionaryFactory = require("./Dictionary/DictionaryFactory");
import BackgroundWorker = require("./BackgroundWorker");

//var _gaq = _gaq || [];
//_gaq.push(['_setAccount', 'UA-26063974-1']);

var translationParser = new TranslationParser();
var dictionaryFactory = new DictionaryFactory();
var historyManager = new HistoryManager(translationParser, localStorage);
var backgroundWorker = new BackgroundWorker(historyManager, dictionaryFactory);
backgroundWorker.initialize();

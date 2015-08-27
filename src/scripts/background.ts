import TranslationParser = require("./TranslationParser");
import HistoryManager = require("./HistoryManager");
import BackgroundWorker = require("./BackgroundWorker");

//var _gaq = _gaq || [];
//_gaq.push(['_setAccount', 'UA-26063974-1']);

var translationParser = new TranslationParser();
var historyManager = new HistoryManager(translationParser, localStorage);
var backgroundWorker = new BackgroundWorker(historyManager);
backgroundWorker.initialize();

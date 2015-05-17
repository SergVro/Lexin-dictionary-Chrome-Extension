/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\google.analytics\ga.d.ts" />

interface HistoryItem {
    word:string;
    translation:string;
    added: number
}

class HistoryManager {
    storageKey:string = "history";
    translationParser: TranslationParser;

    constructor() {
        this.translationParser = new TranslationParser();
    }

    getHistory(/* String */langDirection, /* Boolean */compress):HistoryItem[] {
        //  Summary
        //      Returns translation history for the specified language direction. If compress is true - all duplicate translations will be merged

        var history = JSON.parse(window.localStorage.getItem(this.storageKey + langDirection));
        if (history && compress) {
            // remove duplicates. We do it only on history request since we don't want to do it on every translation operation
            this._removeDuplicates(history);
            history.sort(this.sort_by('added', true));
            window.localStorage.setItem(this.storageKey + langDirection, JSON.stringify(history));
        }
        return history;
    }

    clearHistory(/* String */langDirection):void {
        //  Summary
        //      Clears translation history for the specified langueage direction
        window.localStorage.removeItem(this.storageKey + langDirection);
    }

    addToHistory(/* String */langDirection, /* String */translation):void {
        //  Summary
        //      Adds a new word and translation to the translation history

        if (!langDirection) {
            console.error('langDirection is required');
        }
        var history = this.getHistory(langDirection, false);
        if (!history) {
            history = [];
        }
        var newTranslations = this.translationParser.parseTranslation(translation, langDirection);
        history = history.concat(newTranslations);
        window.localStorage.setItem(this.storageKey + langDirection, JSON.stringify(history));
    }

    private _removeDuplicates(history:HistoryItem[]) {
        //  Summary
        //      Removes duplicate entries from the specified history array
        for (var i = history.length - 1; i >= 0; i--) {
            for (var j = i - 1; j >= 0; j--) {
                if (history[i].word === history[j].word) {
                    if (history[i].translation === history[j].translation) { // if we already have the same word with the same translation
                        console.log('Duplicate translation found for word ' + history[i].word + '. Translation ' + history[i].translation + '. Indexes ' + i + ' and ' + j);
                        history.splice(i, 1);                               // remove it
                        break;
                    }
                    // try to combine different translations in the list
                    console.log('Combining translation for word: ' + history[i].word + '. Translation 1 ' + history[i].translation + ' and Translation 2 ' + history[j].translation);
                    var separator = '; ';
                    var iTranslations = history[i].translation.split(separator);
                    var jTranslations = history[j].translation.split(separator);
                    var allTranslations = this._combineTranslations(iTranslations, jTranslations);

                    history[j].translation = allTranslations.join(separator);
                    history.splice(i, 1);                               // remove it
                    console.log('Combination result ' + history[j].translation);
                    break;
                }
            }
        }
    }

    private _combineTranslations(translations1:string[], translations2:string[]) {
        //  Summary
        //      Combines two translation arrays in a single array and removes duplicate entries
        var result = $.merge([], translations1);
        for (var i = 0; i < translations2.length; i++) {
            if ($.inArray(translations2[i], result) === -1) {
                result.push(translations2[i]);
            }
        }
        return result;
    }

    private sort_by(field:string, reverse:boolean, primer?) {
        //  Summary
        //      Sorting routine
        var reverseNum = (reverse) ? -1 : 1;
        return function (a, b) {

            a = a[field];
            b = b[field];

            if (typeof (primer) !== 'undefined') {
                a = primer(a);
                b = primer(b);
            }

            if (a < b) {
                return reverseNum * -1;
            }
            if (a > b) {
                return reverseNum;
            }
            return 0;
        };
    }
}

class TranslationParser {
    // Translation parsing regular expression
    translationRegexLexin = /^<p><div><b><span lang=sv_SE>(.+?)<\/span><\/b>.*<\/div><div><b><span lang=.+>(.+?)<\/span><\/b>&nbsp;&nbsp;.*?$/igm;
    translationRegexFolkets = /<p><img.*\(S.+?\).*\/>\s*<b>(.+?)<\/b>.*<img.*\(E.+?\).*\/>\s*<b>(.+?)<\/b>.*<\/p>$/igm;

    parseTranslation(translation:string, langDirection:string):HistoryItem[] {
        //  Summary
        //      Returns an array of a words parsed from specified translation
        var result = [],
            match,
            currentRegex = this.translationRegexLexin;

        if (langDirection === 'swe_eng') {
            currentRegex = this.translationRegexFolkets;
        }
        while (match = currentRegex.exec(translation)) {
            var wordHistory = match[1];
            var translationHistory = match[2];
            if (wordHistory && translationHistory) {
                wordHistory = wordHistory.replace('|', ''); // removing vertical bars from the word
                var d = new Date();
                var historyItem:HistoryItem = {
                    word: wordHistory,
                    translation: translationHistory,
                    added: d.getTime()
                };
                result.push(historyItem);
                console.log('Found word ' + wordHistory + ' -> ' + translationHistory);
            }
            else {
                console.error('Error parsing translation');
            }
        }
        return result;
    }
}

interface Language {
    value: string;
    text: string
}

class BackgroundWorker {

    historyManager: HistoryManager;
    // The list of available languages
    languages: Language[] = [
        {value: "swe_alb", text: "Albanian"},
        {value: "swe_amh", text: "Amharic"},
        {value: "swe_ara", text: "Arabic"},
        {value: "swe_azj", text: "Azerbaijani"},
        {value: "swe_bos", text: "Bosnian"},
        {value: "swe_hrv", text: "Croatian"},
        {value: "swe_eng", text: "English"}, // English requires Folkets lexikon
        {value: "swe_fin", text: "Finnish"},
        {value: "swe_gre", text: "Greek"},
        {value: "swe_kmr", text: "Northern Kurdish"},
        {value: "swe_pus", text: "Pashto"},
        {value: "swe_per", text: "Persian"},
        {value: "swe_rus", text: "Russian"},
        {value: "swe_srp", text: "Serbian (Latin)"},
        {value: "swe_srp_cyrillic", text: "Serbian (Cyrillic)"},
        {value: "swe_som", text: "Somali"},
        {value: "swe_sdh", text: "South Kurdish"},
        {value: "swe_spa", text: "Spanish"},
        {value: "swe_swe", text: "Swedish"},
        {value: "swe_tur", text: "Turkish"}];

    getTranslation(word:string, direction:string) {
        //  Summary
        //      Returns a translation for the specified word
        var deferred = $.Deferred(), self = this;
        word = $.trim(word);
        if (!word) {
            console.error('word is required');
            deferred.reject('word is required');
            return deferred;
        }

        var langDirection = localStorage["defaultLanguage"];
        _gaq.push(['_trackEvent', 'Translation', langDirection, word]);
        if (!langDirection) {
            langDirection = 'swe_swe';
            localStorage["defaultLanguage"] = langDirection;
        }
        console.log('Translation search for word ' + word + ', langugae ' + langDirection);

        var query = 'http://lexin.nada.kth.se/lexin/service?searchinfo=' + (direction || 'to') + ',' + langDirection + ',' + encodeURIComponent(word);
        if (langDirection === 'swe_eng') {
            query = 'http://folkets-lexikon.csc.kth.se/folkets/service?lang=' +
                (direction === 'from' ? 'en' : 'sv') + '&interface=en&word=' + encodeURIComponent(word);
        }
        $.get(query).done(function (data) {
            deferred.resolve(data);
            self.historyManager.addToHistory(langDirection, data);
        }).fail(function (error) {
            deferred.reject(error);
        });
        return deferred;
    }

    // ----------------------------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------------------------

    constructor() {
        _gaq.push(['_setAccount', 'UA-26063974-1']);
        this.historyManager = new HistoryManager();
    }

    initialize() {
        var self = this;
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.method === "getTranslation") {
                self.getTranslation(request.word, request.direction || 'to').done(function (data) {
                    sendResponse({translation: data});
                }).fail(function (error) {
                    var errorMessage = "Error connecting to the dictionary service: " +
                        (error ? error.status : "Unknown");
                    sendResponse({translation: null, error: errorMessage});
                });
            } else if (request.method === "getHistory") {
                sendResponse(self.historyManager.getHistory(request.langDirection, true));
            } else if (request.method === "clearHistory") {
                self.historyManager.clearHistory(request.langDirection);
                sendResponse();
            } else if (request.method === "getLanguages") {
                sendResponse(self.languages);
            } else {
                sendResponse({});
            }
            return true;
        });
    }
}

var _gaq = _gaq || [];
var backgroundWorker:BackgroundWorker = new BackgroundWorker();
backgroundWorker.initialize();

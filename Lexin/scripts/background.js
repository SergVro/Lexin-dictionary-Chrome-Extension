// Local storage key
var storageKey = "history";

// Translation parsing regular expression
var translationRegex = /^<p><div><b>(.+?)<\/b>.*<\/div><div><b>(.+?)<\/b>&nbsp;&nbsp;.*<\/div>.*<\/p><br\/><br\/>.?$/igm;

// The list of available languages
var languages = [
    { value: "swe_alb", text: "Albania" },
    { value: "swe_ara", text: "Arabic" },
    { value: "swe_bos", text: "Bosnian" },
    { value: "swe_fin", text: "Finnish" },
    { value: "swe_gre", text: "Greek" },
    { value: "swe_hrv", text: "Croatian" },
    { value: "swe_kmr", text: "Northern Kurdish" },
    { value: "swe_per", text: "Persian" },
    { value: "swe_rus", text: "Russian" },
    { value: "swe_srp", text: "Serbian" },
    { value: "swe_som", text: "Somali" },
    { value: "swe_sdh", text: "South Kurdish" },
    { value: "swe_swe", text: "Swedish" },
    { value: "swe_tur", text: "Turkish"}];

// ----------------------------------------------------------------------------
// Public section
// ----------------------------------------------------------------------------

function getTranslation(/* String */word, /* Function */callback) {
    //  Summary
    //      Returns a translation for the specified word
    word = $.trim(word);
    if (!word) {
        console.error('word is required');
        return;
    }

    var langDirection = localStorage["defaultLanguage"];
    _gaq.push(['_trackEvent', 'Translation', langDirection, word]);
    if (!langDirection) {
        langDirection = 'swe_swe';
        localStorage["defaultLanguage"] = langDirection;
    }
    console.log('Translation search for word ' + word + ', langugae ' + langDirection);
    var query = 'http://lexin.nada.kth.se/lexin/service?searchinfo=to,' + langDirection + ',' + encodeURIComponent(word);
    $.get(query, function (data) {
        callback(data);
        _addToHistory(langDirection, data);
    });
}

function getHistory(/* String */langDirection, /* bool */compress) {
    //  Summary
    //      Returns translation history for the specified language direction. If compress is true - all duplicate translations will be merged
    
    var history = JSON.parse(window.localStorage.getItem(storageKey + langDirection));
    if (history && compress) {
        // remove duplicates. We do it only on history request since we don't want to do it on every translation operation
        _removeDuplicates(history);
        history.sort(sort_by('added', true));
        window.localStorage.setItem(storageKey + langDirection, JSON.stringify(history));
    }
    return history;
}

function clearHistory(/* String */langDirection) {
    //  Summary
    //      Clears translation history for the specified langueage direction
    window.localStorage.removeItem(storageKey + langDirection);
}

// ----------------------------------------------------------------------------
// Private section
// ----------------------------------------------------------------------------

function _addToHistory(/* String */langDirection, /* String */translation) {
    //  Summary
    //      Adds a new word and translation to the translation history

    if (!langDirection) {
        console.error('langDirection is required');
    }
    var history = getHistory(langDirection, false);
    if (!history) {
        history = new Array();
    }
    var newTranslations = _parseTranslation(translation);
    history = history.concat(newTranslations);
    window.localStorage.setItem(storageKey + langDirection, JSON.stringify(history));
}

function _parseTranslation(/*String*/translation) {
    //  Summary
    //      Returns an array of a words parsed from specified translation
    var result = [];
    var match;
    while (match = translationRegex.exec(translation)) {
        var wordHistory = match[1];
        var translationHistory = match[2];
        if (wordHistory && translationHistory) {
            wordHistory = wordHistory.replace('|', ''); // removing vertical bars from the word
            var d = new Date();
            var historyItem = { word: wordHistory, translation: translationHistory, added: d.getTime() };
            result.push(historyItem);
            console.log('Found word ' + wordHistory + ' -> ' + translationHistory);
        }
        else {
            console.error('Error parsing translation');
        }
    }
    return result;
}

function _removeDuplicates(/*Array*/history) {
    //  Summary
    //      Removes duplicate entries from the specified hitory array
    for (var i = history.length - 1; i >= 0; i--) {
        for (var j = i - 1; j >= 0; j--) {
            if (history[i].word == history[j].word) {
                if (history[i].translation == history[j].translation) { // if we already have the same word with the same translation
                    console.log('Duplicate translation found for word ' + history[i].word + '. Translation ' + history[i].translation + '. Indexes ' + i + ' and ' + j);
                    history.splice(i, 1);                               // remove it
                    break;
                }
                // try to combine different translations in the list
                console.log('Combining translation for word: ' + history[i].word + '. Translation 1 ' + history[i].translation + ' and Translation 2 ' + history[j].translation);
                var separator = '; ';
                var iTranslations = history[i].translation.split(separator);
                var jTranslations = history[j].translation.split(separator);
                var allTranslations = _combineTranslations(iTranslations, jTranslations);
                
                history[j].translation = allTranslations.join(separator);
                history.splice(i, 1);                               // remove it
                console.log('Combination resutl ' + history[j].translation);
                break;
            }
        }
    }
}

function _combineTranslations(/* Array of Strings */translations1, /* Array of Strings */translations2) {
    //  Summary
    //      Combines two translation arrays in a single array and removes duplicate entries
    var result = $.merge([], translations1);
    for (var i = 0; i < translations2.length; i++) {
        if ($.inArray(translations2[i], result) == -1) {
            result.push(translations2[i]);
        }
    }
    return result;
}

function sort_by(/* String */field, /* bool */reverse, /* Func */primer) {
    //  Summary
    //      Sorting rutine
    reverse = (reverse) ? -1 : 1;
    return function (a, b) {

        a = a[field];
        b = b[field];

        if (typeof (primer) != 'undefined') {
            a = primer(a);
            b = primer(b);
        }

        if (a < b) return reverse * -1;
        if (a > b) return reverse * 1;
        return 0;
    };
}
// ----------------------------------------------------------------------------
// Initialization 
// ----------------------------------------------------------------------------

chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
    if (request.method == "getTranslation") {
        getTranslation(request.word, function (data) {
            sendResponse({ translation: data });
        });
    }
    else if (request.method == "getHistory") {
        sendResponse(getHistory(request.langDirection, true));
    }
    else if (request.method == "clearHistory") {
        clearHistory(request.langDirection);
        sendResponse();
    }
    else if (request.method == "getLanguages") {
        sendResponse(languages);
    }
    else {
        sendResponse({});
    }
});
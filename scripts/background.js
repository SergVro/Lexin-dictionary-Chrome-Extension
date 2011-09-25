var storageKey = "history";
var translationRegex = /^<p><div><b>(.+?)<\/b>.*<\/div><div><b>(.+?)<\/b>&nbsp;&nbsp;.*<\/div>.*<\/p><br\/><br\/>.?$/igm;

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
    { value: "swe_tur", text: "Turkish" }];

function getTranslation(word, callback) {
    var langDirection = localStorage["defaultLanguage"];
    if (!langDirection) {
        langDirection = 'swe_swe';
        localStorage["defaultLanguage"] = langDirection;
    }
    var query = 'http://lexin.nada.kth.se/lexin/service?searchinfo=to,' + langDirection + ',' + encodeURIComponent(word);
    var translation = "Translation error.";
    $.get(query, function (data) {
        callback(data);
        addToHistory(langDirection, word, data);
    });
    console.log(translation);
}


function sort_by(field, reverse, primer) {

    reverse = (reverse) ? -1 : 1;

    return function(a, b) {

        a = a[field];
        b = b[field];

        if (typeof(primer) != 'undefined') {
            a = primer(a);
            b = primer(b);
        }

        if (a < b) return reverse * -1;
        if (a > b) return reverse * 1;
        return 0;

    };
}

function addToHistory(langDirection, word, translation) {
    if (!langDirection) {
        console.error('langDirection is required');
    }

    if (!word) {
        console.error('word is required');
    }
    
    var history = getHistory(langDirection, false);

    if (!history) {
        history = new Array();
    }
    var match = null;
    while (match = translationRegex.exec(translation)) {
         var wordHistory = match[1];
         var translationHistory = match[2];
         if (wordHistory && translationHistory) {
             wordHistory = wordHistory.replace('|', '');
             var d = new Date();
             var historyItem = { word: wordHistory, translation: translationHistory, added: d.getTime() };
             history.push(historyItem);
             console.log('Found word ' + wordHistory + ' -> ' + translationHistory);
         }
         else {
             console.error('Error parsing translation');
         }
    }
     window.localStorage.setItem(storageKey + langDirection, JSON.stringify(history));
}

function getHistory(langDirection, compress) {
    var history = JSON.parse(window.localStorage.getItem(storageKey + langDirection));
    if (history && compress) {
        // remove duplicates
        for (var i = history.length - 1; i >= 0; i--) {
            for (var j = i - 1; j >= 0; j--) {
                if (history[i].word == history[j].word && history[i].translation == history[j].translation) {
                    history = history.slice(0, i);
                    break;
                }
            }
        }
        history.sort(sort_by('added', true));
        window.localStorage.setItem(storageKey + langDirection, JSON.stringify(history));
    }
    return history;
}

function clearHistory(langDirection) {
    window.localStorage.removeItem(storageKey + langDirection);
}

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
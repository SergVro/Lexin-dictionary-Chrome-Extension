chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
    if (request.method == "getSelection") {
        var selectedText = window.getSelection().toString();
        if (selectedText == '') {
            // getSelection doesn't work for iframes so we have to get a previously soted selection value
            var savedSelection = window.localStorage.getItem('savedSelection');
            selectedText = savedSelection;
        }
        sendResponse({ data: selectedText });
    } else {
        sendResponse({});
    }
});

$(document).click(function (evt) {
    if ($(".lexinTranslationContainer").length > 0) {
        $(".lexinTranslationContainer").remove();
    }
    var selection = window.getSelection().toString();
    selection = $.trim(selection);
    if (selection && evt.altKey) {

        chrome.extension.sendRequest({ method: "getTranslation", word: selection }, function (response) {
            var absolutContainer = $('<div></div>').css('position', 'absolute').insertAfter('body');
            var container = $('<div></div>').addClass("lexinTranslationContainer").appendTo(absolutContainer);
            $('<div></div>').attr('id', 'translation').addClass('lexinTranslationContent').html(response.translation).appendTo(container);

            adaptLinks($('#translation'));

            container.position({
                of: evt,
                my: "left bottom",
                at: "center top",
                offset: "-10",
                collision: "flip"
            });
        });
    }
});

$(document).mouseup(function (evt) {
    // saving selected text since window.getSelection doesn't work if selection is in iframe
    var selectedText = window.getSelection().toString();
    if (selectedText != '') {
        window.localStorage.setItem('savedSelection', selectedText);
    }
});

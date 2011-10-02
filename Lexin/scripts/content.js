
chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
    if (request.method == "getSelection")
        sendResponse({ data: window.getSelection().toString() });
    else
        sendResponse({});
});

$(document).click(function (evt) {
    $(".lexinTranslationContainer").remove();
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
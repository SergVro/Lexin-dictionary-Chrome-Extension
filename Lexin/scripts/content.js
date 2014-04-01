(function () {
    chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
        if (request.method === "getSelection") {
            var selectedText = window.getSelection().toString();
            if (selectedText !== '') {
                // send response only is there is a selected text 
                // since content script is loaded for all frames on a page
                // this prevents empty callbacks to popup 
                sendResponse({ data: selectedText });
            }
        }
        else {
            sendResponse({});
        }
    });

    $(document).click(function(evt) {
        var translationContainer = $(".lexinTranslationContainer");
        if (translationContainer.length > 0) {
            translationContainer.remove();
        }
        var selection = window.getSelection().toString();
        selection = $.trim(selection);
        if (selection && evt.altKey) {
            var absolutContainer = $('<div></div>').css('position', 'absolute').insertAfter('body');
            var container = $('<div></div>').addClass("lexinTranslationContainer").appendTo(absolutContainer);
            var translationBlock = $('<div></div>').attr('id', 'translation').addClass('lexinTranslationContent')
                .html("Searching for '"+selection+"'...").appendTo(container);

            container.position({
                of: evt,
                my: "left bottom",
                at: "center top",
                offset: "-10",
                collision: "flip"
            });

            chrome.extension.sendRequest({ method: "getTranslation", word: selection }, function(response) {

                translationBlock.html(response.translation || response.error);
                LexinExtensionCommon.adaptLinks($('#translation'));
            });
        }

    });
})();
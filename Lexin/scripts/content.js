var playerTemplate = '<audio><source src="MP3_FILE_URL" type="audio/mp3" /></audio>';

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

            $('a', '#translation').attr('target', '_blank');
            
            $.each($('a', '#translation'), function (i, anchor) {
                var url = $(anchor).attr('href');
                if (url.match(/mp3$/)) { // if url is a MP3 file reference - cahnge link to play audio tag
                    var playerHtml = playerTemplate.replace('MP3_FILE_URL', url);
                    $(anchor).after(playerHtml);
                    $(anchor).attr('href', '#').click(function (e) {
                        $(this).next()[0].play();
                        e.preventDefault();
                        return false;
                    });
                }
            });
            
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
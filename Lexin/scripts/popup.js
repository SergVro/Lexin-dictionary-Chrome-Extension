var playerTemplate = '<audio><source src="MP3_FILE_URL" type="audio/mp3" /></audio>';

function getTranslation() {
    var word = $('#word').val();
    word = $.trim(word);
    if (!word || word == '') {
        return;
    }
    chrome.extension.sendRequest({ method: "getTranslation", word: word }, function (transData) {
        $('#translation').html(transData.translation);

        $('a', '#translation').attr('target', '_blank');

        $.each($('a', '#translation'), function (i, anchor) {
            var url = $(anchor).attr('href');
            if (url.match(/mp3$/)) { // if url is a MP3 file reference - cahnge link to play audio tag
                var playerHtml = playerTemplate.replace('MP3_FILE_URL', url);
                $(anchor).after(playerHtml);
                $(anchor).attr('href', '#').click(function (e) {
                    $(this).next()[0].play();
                    e.preventDefault();
                });
            }
        });
    });
};

chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.sendRequest(tab.id, { method: "getSelection" }, function (response) {
        if (response.data) {
            $('#word').val(response.data);
            getTranslation();
        }
        else {
            $('#translation').html('No word selected');
        }
    });
});

function fillLanguages(callback) {
    chrome.extension.sendRequest({ method: "getLanguages" }, function (response) {
        $.each(response, function (i, lang) {
            var option = $('<option></option>').attr('value', lang.value).append(lang.text);
            $('#language').append(option);
        });
        callback();
    });
}


$(function () {
    fillLanguages(function () {
        $('#language').val(localStorage["defaultLanguage"]);
    });
    $('#language').change(function (evt) {
        localStorage["defaultLanguage"] = $('#language').val();
        getTranslation();
    });

    $('a#historyLink').click(function (e) {

        chrome.tabs.create({ 'url': 'html/history.html' }, function (tab) {

        });
        return false;
    });
});
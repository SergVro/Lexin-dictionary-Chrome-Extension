function getTranslation() {
    var word = $('#word').val();
    word = $.trim(word);
    if (!word || word == '') {
        return;
    }
    chrome.extension.sendRequest({ method: "getTranslation", word: word }, function (transData) {
        $('#translation').html(transData.translation);
        adaptLinks($('#translation'));

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
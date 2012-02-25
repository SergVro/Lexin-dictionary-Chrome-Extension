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

function fillLanguages(callback) {
    chrome.extension.sendRequest({ method: "getLanguages" }, function (response) {
        $.each(response, function (i, lang) {
            var option = $('<option></option>').attr('value', lang.value).append(lang.text);
            $('#language').append(option);
        });
        callback();
    });
}

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

    $(document).click(function(evt) {
        var selection = window.getSelection().toString();
        if (selection !== '') {
            $('#word').val(selection);
            getTranslation();
        }
    });
    
    //window.localStorage.setItem('showQuickTip', 'Yes');
    var showQuickTip = window.localStorage.getItem('showQuickTip');
    console.log(showQuickTip);
    if (showQuickTip != 'No') {
        console.log('show quick tip');
        $('.quickTipContainer').css('display', 'block');
        $('.quickTipContainer').click(function (e) {
            $('.quickTipContainer').fadeOut('fast', function () {
                $('.quickTipContainer').css('display', 'none');
            });
            window.localStorage.setItem('showQuickTip', 'No');
        });
    }

});

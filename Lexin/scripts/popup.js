(function () {
    var history = [];
    var historyIndex = -1;

    function getTranslation() {
        var word = $('#word').val();
        word = $.trim(word);
        if (!word || word == '') {
            return;
        }
        chrome.extension.sendRequest({ method: "getTranslation", word: word }, function (transData) {
            $('#translation').html(transData.translation);
            LexinExtensionCommon.adaptLinks($('#translation'));

        });
    }

    function setCurrentWord(word, skipHistory, skipInput) {
        word = $.trim(word);
        $('#word').val(word);

        if (!skipInput) {
            $('#wordInput').val(word);
        }
        if (!skipHistory) {
            history.push(word);
            historyIndex = -1;
        }
    }


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
                setCurrentWord(response.data);
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

        $(document).click(function (evt) {
            var selection = window.getSelection().toString();
            if (selection !== '') {
                setCurrentWord(selection);
                getTranslation();
            }
        });

        var timer = null;
        $('#wordInput').keyup(function (e) {
            if (e.altKey) {
                return;
            }
            clearTimeout(timer);
            var word = $(this).val();
            if (word.length >= 2) {
                timer = setTimeout(function () {
                    setCurrentWord(word, false, true);
                    getTranslation();
                }, 500);
            }
        });
        $('#wordInput').focus();

        $(document).keyup(function (e) {
            if (e.altKey) {
                if (e.which == 37) { // left arrow
                    if (historyIndex < 0) {
                        historyIndex = history.length - 1;
                    }
                    if (historyIndex == 0) {
                        return;
                    }
                    historyIndex--;
                    setCurrentWord(history[historyIndex], true);
                    getTranslation();
                }
                if (e.which == 39) { // right arrow
                    if (historyIndex == history.length - 1) {
                        historyIndex = -1;
                    }
                    if (historyIndex < 0) {
                        return;
                    }
                    historyIndex++;
                    setCurrentWord(history[historyIndex], true);
                    getTranslation();
                }
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

})();

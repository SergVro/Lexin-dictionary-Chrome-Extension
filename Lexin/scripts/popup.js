(function () {
    var history = [];
    var historyIndex = -1;
    var currentWord;

    function getTranslation(direction) {
        var word = $('#word').val();
        word = $.trim(word);
        if (!word || word === '') {
            return;
        }
        var translationBox = $('#translation');
        translationBox.html("Searching for '"+word+"'...");
        chrome.extension.sendRequest({ method: "getTranslation", word: word, direction: direction}, function (response) {
            if (word === currentWord) {
                translationBox.html(response.translation || response.error);
                LexinExtensionCommon.adaptLinks(translationBox);
            }

        });
    }

    function setCurrentWord(word, skipHistory, skipInput) {
        currentWord = word = $.trim(word);
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
            if (response && response.data) {
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
        $('#language').change(function () {
            localStorage["defaultLanguage"] = $('#language').val();
            getTranslation();
        });

        $('a#historyLink').click(function () {
            chrome.tabs.create({ 'url': 'html/history.html' }, function (tab) {

            });
            return false;
        });

        $(document).click(function () {
            var selection = window.getSelection().toString();
            if (selection !== '') {
                setCurrentWord(selection);
                getTranslation();
            }
        });

        var timer = null;
        var wordInput=$('#wordInput');
        wordInput.keyup(function (e) {
            if (e.altKey) {
                return;
            }
            clearTimeout(timer);
            var word = $(this).val();
            if (word.length >= 2) {
                timer = setTimeout(function () {
                    setCurrentWord(word, false, true);
                    getTranslation('to');
                }, 500);
            }
        });

        wordInput[0].focus();

        $('#fromWordInput').keyup(function (e) {
            if (e.altKey) {
                return;
            }
            clearTimeout(timer);
            var word = $(this).val();
            if (word.length >= 2) {
                timer = setTimeout(function () {
                    setCurrentWord(word, false, true);
                    getTranslation('from');
                }, 500);
            }
        });


        $(document).keyup(function (e) {
            if (e.ctrlKey) {
                if (e.which === 37) { // left arrow
                    e.preventDefault();
                    if (historyIndex < 0) {
                        historyIndex = history.length - 1;
                    }
                    if (historyIndex === 0) {
                        return;
                    }
                    historyIndex--;
                    setCurrentWord(history[historyIndex], true);
                    getTranslation();
                }
                if (e.which === 39) { // right arrow
                    e.preventDefault();
                    if (historyIndex === history.length - 1) {
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
        if (showQuickTip !== 'No') {
            var tipContainer = $('.quickTipContainer');
            tipContainer.css('display', 'block');
            tipContainer.click(function () {
                $('.quickTipContainer').fadeOut('fast', function () {
                    $('.quickTipContainer').css('display', 'none');
                });
                window.localStorage.setItem('showQuickTip', 'No');
            });
        }

    });

})();

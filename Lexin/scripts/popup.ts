/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="common.ts" />

module LexinExtension.Popup {

    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-26063974-1']);
    _gaq.push(['_trackPageview']);

    var history = [];
    var historyIndex = -1;
    var currentWord;


    function getTranslation(direction?:string) {
        var word = $('#word').val();
        word = $.trim(word);
        if (!word || word === '') {
            return;
        }
        var translationBox = $('#translation');
        translationBox.html("Searching for '" + word + "'...");
        chrome.runtime.sendMessage({
            method: "getTranslation",
            word: word,
            direction: direction
        }, function (response) {
            if (word === currentWord) {
                translationBox.html(response.translation || response.error);
                LexinExtension.Common.adaptLinks(translationBox);
            }

        });
    }

    function setCurrentWord(word:string, skipHistory?:boolean, skipInput?:boolean) {
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
        chrome.runtime.sendMessage({method: "getLanguages"}, function (response) {
            $.each(response, function (i, lang) {
                var option = $('<option></option>').attr('value', lang.value).append(lang.text);
                $('#language').append(option);
            });
            callback();
        });
    }

    chrome.tabs.query({active: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {method: "getSelection"}, function (response) {
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
            chrome.tabs.create({'url': 'html/history.html'}, function () {
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
        var wordInput = $('#wordInput');
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
}

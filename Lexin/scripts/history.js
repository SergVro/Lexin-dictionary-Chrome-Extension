
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-26063974-1']);
_gaq.push(['_trackPageview']);

(function () {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

(function () {
    function showHistory() {
        var langDirection = $("#language").val();
        $('#history').empty();
        var showDate = $('#showDate').prop('checked');
        chrome.extension.sendRequest({ method: "getHistory", langDirection: langDirection }, function (history) {
            var table = $('<table></table>');
            var thead = $('<thead></thead>');
            table.append(thead);

            var dateHead = $('<th>Date</th>');
            var wordHead = $('<th>Word</th>');
            var translationHead = $('<th>Translation</th>');

            if (showDate){
                thead.append(dateHead);
            }
            thead.append(wordHead);
            thead.append(translationHead);

            $('#history').append(table);
            if (history && history.length > 0) {
                var prevAddedDateStr = "";
                $.each(history, function (i, item) {

                    var tr = $('<tr></tr>');
                    var tdWord = $('<td></td>');
                    var tdTrans = $('<td></td>');
                    var tdAdded =$('<td></td>');

                    tdWord.html(item.word);
                    tdTrans.html(item.translation);
                    var addedDateStr = new Date(item.added).toDateString();
                    if (addedDateStr == prevAddedDateStr)
                    {
                        addedDateStr = "";
                        tdAdded.addClass("noBottomBorder")
                    }
                    else
                    {
                        prevAddedDateStr = addedDateStr;
                    }
                    tdAdded.html(addedDateStr);

                    if (showDate){
                        tr.append(tdAdded);
                    }
                    tr.append(tdWord);
                    tr.append(tdTrans);

                    table.append(tr);

                });
            }
            else {
                var noTranslationsTd = $('<td>No translations in history</td>');
                if (showDate)                {
                    noTranslationsTd.attr('colspan',3);
                }
                else {
                    noTranslationsTd.attr('colspan',2);
                }
                table.append( $('<tr></tr>').append(noTranslationsTd));
            }

        });
    }

    function restore_language() {
        var language = localStorage["defaultLanguage"];
        if (!language) {
            language = 'swe_swe';
        }
        $("#language").val(language);
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


    $(function() {

        $('#showDate').prop('checked', localStorage["showDate"]=='true');
        fillLanguages(function() {
            restore_language();
            showHistory();
        });

        $("#language").change(function(e) {
            showHistory();
        });

        $('#clearHistory').click(function(e) {
            var langDirection = $("#language").val();
            var langName = $("#language option[value='" + langDirection + "']").text();
            if (confirm('Are you sure you want to clear history for language ' + langName)) {
                chrome.extension.sendRequest({ method: "clearHistory", langDirection: langDirection }, function() {
                    showHistory();
                });
            }
        });


        $('#showDate').change(function(){
            localStorage["showDate"] = $('#showDate').prop('checked');
            showHistory();
        })

    });
})();
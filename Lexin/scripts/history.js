function showHistory() {
    var langDirection = $("#language").val();
    $('#history').empty();
    chrome.extension.sendRequest({ method: "getHistory", langDirection: langDirection }, function (history) {
        var table = $('<table></table>');
        table.append('<thead><tr><th>Word</th><th>Translation</th></tr></thead>');
        $('#history').append(table);
        if (history && history.length > 0) {
            $.each(history, function (i, item) {

                var tr = $('<tr></tr>');
                var tdWord = $('<td></td>');
                var tdTrans = $('<td></td>');
                tdWord.html(item.word);
                tdTrans.html(item.translation);
                tr.append(tdWord);
                tr.append(tdTrans);
                table.append(tr);

            });
        }
        else {
            table.append('<tr><td colspan=2>No translations in history</td>s</tr>');
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


$(function () {

    fillLanguages(function () {
        restore_language();
        showHistory();
    });

    $("#language").change(function (e) {
        showHistory();
    });

    $('#clearHistory').click(function (e) {
        var langDirection = $("#language").val();
        var langName = $("#language option[value='"+langDirection+"']").text();
        if (confirm('Are you sure you want to clear history for language ' + langName)) {
            chrome.extension.sendRequest({ method: "clearHistory", langDirection: langDirection }, function () {
                showHistory();
            });
        }
    });

})
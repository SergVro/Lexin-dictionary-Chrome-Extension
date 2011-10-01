
// Saves options to localStorage.
function save_options() {
    localStorage["defaultLanguage"] = $("input[name='langs']:checked").val();

    // Update status to let user know options were saved.
    $("#status").html("Options saved");
    $("#status").show();
    setTimeout(function () {
        $("#status").fadeOut("fast");
    }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
    var language = localStorage["defaultLanguage"];
    if (!language) {
        language = 'swe_swe';
    }
    $("input[name='langs']").val([language]);
}

function fillLanguages(callback) {
    chrome.extension.sendRequest({ method: "getLanguages" }, function (response) {

        $.each(response, function (i, lang) {
            var li = $('<li></li>');
            var input = $('<input></input>').attr('type', 'radio').attr('name', 'langs').attr('value', lang.value).attr('id', lang.value);
            var span = $('<label></label>').attr('for', lang.value).text(lang.text);
            li.append(input);
            li.append(span);
            $('#languageButtons').append(li);
        });
        $("input[name='langs']").change(save_options);
        callback();
    });
}

$(function () {
    fillLanguages( function () {
        restore_options();
    });
    $("#buttonSave").click(function (e) {
        save_options();
    });
});

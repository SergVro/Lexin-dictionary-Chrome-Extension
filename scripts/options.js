
// Saves options to localStorage.
function save_options() {
    localStorage["defaultLanguage"] = $("#language").val();

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
    fillLanguages( function () {
        restore_options();
    });
    $("#buttonSave").click(function (e) {
        save_options();
    });
});

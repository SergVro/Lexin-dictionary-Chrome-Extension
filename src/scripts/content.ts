/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\jqueryui\jqueryui.d.ts" />
/// <reference path="..\lib\chrome\chrome.d.ts" />
/// <reference path="..\lib\requirejs\require.d.ts" />

import LinkAdapter = require("./LinkAdapter");
import BackendService = require("./BackendService");

var subscribeOnGetSelection = function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.method === "getSelection") {
            var selectedText = window.getSelection().toString();
            if (selectedText !== "") {
                // send response only is there is a selected text
                // since content script is loaded for all frames on a page
                // this prevents empty callbacks to popup
                sendResponse({data: selectedText});
            }
        } else {
            sendResponse({});
        }
    });
};

var subscribeOnClicks = function () {
    var backendService = new BackendService();
    $(document).click(function (evt) {
        var translationContainer = $(".lexinTranslationContainer");
        if (translationContainer.length > 0) {
            translationContainer.remove();
        }
        var selection = window.getSelection().toString();
        selection = $.trim(selection);
        if (selection && evt.altKey) {
            var absoluteContainer = $("<div></div>").addClass("yui3-cssreset")
                .css("position", "absolute").insertAfter("body");
            var container = $("<div></div>")
                .addClass("yui3-cssreset").addClass("lexinTranslationContainer")
                .appendTo(absoluteContainer);
            var translationBlock = $("<div></div>").attr("id", "translation")
                .addClass("yui3-cssreset").addClass("lexinTranslationContent")
                .html("Searching for '" + selection + "'...").appendTo(container);

            container.position({
                of: evt,
                my: "left bottom",
                at: "center top",
                offset: "-10",
                collision: "flip"
            });

            backendService.getTranslation(selection).then((response) => {
                translationBlock.html(response.translation || response.error);
                LinkAdapter.AdaptLinks($("#translation"));
            });

        }
    });
};

function initialize() {
    subscribeOnGetSelection();
    subscribeOnClicks();
}

initialize();

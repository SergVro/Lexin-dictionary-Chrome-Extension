//# sourceURL=ContentScript.js

/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\jqueryui\jqueryui.d.ts" />

import interfaces = require("./Interfaces");
import IBackendService = interfaces.IBackendService;
import LinkAdapter = require("./LinkAdapter");
import BackendService = require("./BackendService");
import MessageBus = require("./MessageBus");
import BackendMethods = require("./BackendMethods");

class ContentScript {

    backendService: IBackendService;

    constructor(backendService: IBackendService) {
        this.backendService = backendService;
    }

    getSelection(): string {
        var selection = window.getSelection().toString();
        selection = $.trim(selection);
        return selection;
    }

    subscribeOnGetSelection() {
        MessageBus.Instance.registerHandler(BackendMethods.getSelection, (args) => {
            var selectedText = this.getSelection();
            if (selectedText !== "") {
                // send response only if there is a selected text
                // since content script is loaded for all frames on a page
                // this prevents empty callbacks to popup
                return selectedText;
            }
        });
    }

    subscribeOnClicks() {
        var self = this;
        $(document).click(function (evt) {
            var mainContainer = $("#lexinExtensionMainContainer");
            if (mainContainer.length > 0) {
                mainContainer.remove();
            }
            var selection = self.getSelection();
            if (selection && evt.altKey) {
                var absoluteContainer = $("<div></div>")
                    .addClass("yui3-cssreset")
                    .attr("id", "lexinExtensionMainContainer")
                    .css("position", "absolute")
                    .insertAfter("body");
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

                self.backendService.getTranslation(selection).then((response) => {
                    translationBlock.html(response.translation || response.error);
                    LinkAdapter.AdaptLinks($("#translation"));
                });

            }
        });
    }

     initialize() {
        this.subscribeOnGetSelection();
        this.subscribeOnClicks();
    }
}

export = ContentScript;


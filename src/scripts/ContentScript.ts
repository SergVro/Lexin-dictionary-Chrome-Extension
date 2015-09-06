//# sourceURL=ContentScript.js

/// <reference path="..\lib\jquery\jquery.d.ts" />
/// <reference path="..\lib\jqueryui\jqueryui.d.ts" />

import interfaces = require("./Interfaces");
import IMessageService = interfaces.IMessageService;
import IMessageHandlers = interfaces.IMessageHandlers;
import LinkAdapter = require("./LinkAdapter");
import MessageService = require("./MessageService");
import MessageBus = require("./MessageBus");
import MessageType = require("./MessageType");

class ContentScript {

    messageService: IMessageService;
    private messageHandlers: IMessageHandlers;

    constructor(MessageService: IMessageService, messageHandlers: IMessageHandlers) {
        this.messageService = MessageService;
        this.messageHandlers = messageHandlers;
    }

    getSelection(): string {
        var selection = window.getSelection().toString();
        selection = $.trim(selection);
        return selection;
    }

    handleGetSelection() {
        this.messageHandlers.registerGetSelectionHandler(() => {
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
        var self = this, insideTranslation = false, zIndex = 10000;
        $(document).click(function (evt) {
            var mainContainer = $(".lexinExtensionMainContainer");
            if (mainContainer.length > 0 && !insideTranslation) {
                mainContainer.remove();
                zIndex = 10000;
            }
            insideTranslation = false;
            var selection = self.getSelection();
            if (selection && evt.altKey) {
                var absoluteContainer = $("<div></div>")
                    .addClass("yui3-cssreset")
                    .addClass("lexinExtensionMainContainer")
                    .css("position", "absolute")
                    .insertAfter("body");
                var container = $("<div></div>")
                    .addClass("yui3-cssreset").addClass("lexinTranslationContainer")
                    .css("zIndex", zIndex++)
                    .appendTo(absoluteContainer).click(function(e) {

                        container.css("zIndex", zIndex++);
                        insideTranslation = true;
                    });
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

                self.messageService.getTranslation(selection).then((response) => {
                    translationBlock.html(response.translation || response.error);
                    LinkAdapter.AdaptLinks($("#translation"));
                });

            }
        });
    }

     initialize() {
        this.handleGetSelection();
        this.subscribeOnClicks();
    }
}

export = ContentScript;


import { IMessageService, IMessageHandlers } from "./Interfaces.js";
import LinkAdapter from "./LinkAdapter.js";
import $ from "jquery";

class ContentScript {

    messageService: IMessageService;
    private messageHandlers: IMessageHandlers;

    constructor(MessageService: IMessageService, messageHandlers: IMessageHandlers) {
        this.messageService = MessageService;
        this.messageHandlers = messageHandlers;
    }

    getSelection(): string {
        let selection = window.getSelection().toString();
        selection = $.trim(selection);
        return selection;
    }

    handleGetSelection() {
        this.messageHandlers.registerGetSelectionHandler(() => {
            const selectedText = this.getSelection();
            if (selectedText !== "") {
                // send response only if there is a selected text
                // since content script is loaded for all frames on a page
                // this prevents empty callbacks to popup
                return selectedText;
            }
        });
    }

    subscribeOnClicks() {
        const self = this;
        let insideTranslation = false;
        let zIndex = 10000;
        $(document).click(function (evt) {
            const mainContainer = $(".lexinExtensionMainContainer");
            if (mainContainer.length > 0 && !insideTranslation) {
                mainContainer.remove();
                zIndex = 10000;
            }
            insideTranslation = false;
            const selection = self.getSelection();
            if (selection && evt.altKey) {
                const absoluteContainer = $("<div></div>")
                    .addClass("yui3-cssreset")
                    .addClass("lexinExtensionMainContainer")
                    .css("position", "absolute")
                    .insertAfter("body");
                const container = $("<div></div>")
                    .addClass("yui3-cssreset").addClass("lexinTranslationContainer")
                    .css("zIndex", zIndex++)
                    .appendTo(absoluteContainer).click(function(_e) {

                        container.css("zIndex", zIndex++);
                        insideTranslation = true;
                    });
                const translationBlock = $("<div></div>").attr("id", "translation")
                    .addClass("yui3-cssreset").addClass("lexinTranslationContent")
                    .html("Searching for '" + selection + "'...");
                translationBlock.appendTo(container);

                // Position the popup near the click event
                (container as any).position({
                    of: evt,
                    my: "center+10 bottom-20",
                    at: "center top",
                    collision: "flipfit"
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

export default ContentScript;


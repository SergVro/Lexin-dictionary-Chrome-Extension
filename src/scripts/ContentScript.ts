import { IMessageService, IMessageHandlers } from "./Interfaces.js";
import LinkAdapter from "./LinkAdapter.js";
import * as DomUtils from "./util/DomUtils.js";
import { position } from "./util/PositionUtils.js";

class ContentScript {

    messageService: IMessageService;
    private messageHandlers: IMessageHandlers;

    constructor(MessageService: IMessageService, messageHandlers: IMessageHandlers) {
        this.messageService = MessageService;
        this.messageHandlers = messageHandlers;
    }

    getSelection(): string {
        let selection = window.getSelection()?.toString() || "";
        selection = DomUtils.trim(selection);
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
        document.addEventListener("click", function (evt: MouseEvent) {
            const mainContainer = document.querySelector(".lexinExtensionMainContainer") as HTMLElement;
            if (mainContainer && !insideTranslation) {
                DomUtils.remove(mainContainer);
                zIndex = 10000;
            }
            insideTranslation = false;
            const selection = self.getSelection();
            if (selection && evt.altKey) {
                const absoluteContainer = DomUtils.createElement("div");
                DomUtils.addClass(absoluteContainer, "yui3-cssreset");
                DomUtils.addClass(absoluteContainer, "lexinExtensionMainContainer");
                DomUtils.setCss(absoluteContainer, "position", "absolute");
                document.body.appendChild(absoluteContainer);
                
                const container = DomUtils.createElement("div");
                DomUtils.addClass(container, "yui3-cssreset");
                DomUtils.addClass(container, "lexinTranslationContainer");
                DomUtils.setCss(container, "zIndex", (zIndex++).toString());
                absoluteContainer.appendChild(container);
                
                container.addEventListener("click", function(_e: MouseEvent) {
                    DomUtils.setCss(container, "zIndex", (zIndex++).toString());
                    insideTranslation = true;
                });
                
                const translationBlock = DomUtils.createElement("div");
                DomUtils.setAttr(translationBlock, "id", "translation");
                DomUtils.addClass(translationBlock, "yui3-cssreset");
                DomUtils.addClass(translationBlock, "lexinTranslationContent");
                DomUtils.setHtml(translationBlock, "Searching for '" + selection + "'...");
                container.appendChild(translationBlock);

                // Position the popup near the click event
                position(container, {
                    of: evt,
                    my: "center+10 bottom-20",
                    at: "center top",
                    collision: "flipfit"
                });

                self.messageService.getTranslation(selection).then((response) => {
                    DomUtils.setHtml(translationBlock, response.translation || response.error);
                    LinkAdapter.AdaptLinks(translationBlock);
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


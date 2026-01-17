import { IMessageService, IMessageHandlers } from "../common/Interfaces.js";
import * as DomUtils from "../util/DomUtils.js";
import { position } from "../util/PositionUtils.js";
import { processTranslationHtml } from "../util/TranslationUtils.js";

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

    private showTranslation(selection: string, evt: MouseEvent, zIndex: number, insideTranslationRef: { value: boolean }): number {
        const self = this;
        const absoluteContainer = DomUtils.createElement("div");
        DomUtils.addClass(absoluteContainer, "yui3-cssreset");
        DomUtils.addClass(absoluteContainer, "lexinExtensionMainContainer");
        // Container doesn't need positioning - child will use fixed positioning
        document.body.appendChild(absoluteContainer);
        
        const container = DomUtils.createElement("div");
        DomUtils.addClass(container, "yui3-cssreset");
        DomUtils.addClass(container, "lexinTranslationContainer");
        DomUtils.setCss(container, "zIndex", (zIndex++).toString());
        absoluteContainer.appendChild(container);
        
        container.addEventListener("click", function(_e: MouseEvent) {
            DomUtils.setCss(container, "zIndex", (zIndex++).toString());
            insideTranslationRef.value = true;
        });
        
        const translationBlock = DomUtils.createElement("div");
        DomUtils.setAttr(translationBlock, "id", "translation");
        DomUtils.addClass(translationBlock, "yui3-cssreset");
        DomUtils.addClass(translationBlock, "lexinTranslationContent");
        DomUtils.setHtml(translationBlock, "Searching for '" + selection + "'...");
        container.appendChild(translationBlock);

        // Function to position the container
        const positionContainer = () => {
            position(container, {
                of: evt,
                my: "center+10 bottom-20",
                at: "center top",
                collision: "flipfit"
            });
        };

        // Position initially (even if size is not final)
        positionContainer();

        // Reposition after content loads (in case size changes)
        self.messageService.getTranslation(selection).then((response) => {
            const html = response.translation || response.error;
            processTranslationHtml(html, translationBlock, positionContainer);
        });

        return zIndex;
    }

    subscribeOnClicks() {
        const self = this;
        const insideTranslationRef = { value: false };
        let zIndex = 10000;
        
        // Handle single click with Alt key
        document.addEventListener("click", function (evt: MouseEvent) {
            const mainContainer = document.querySelector(".lexinExtensionMainContainer") as HTMLElement;
            if (mainContainer && !insideTranslationRef.value) {
                DomUtils.remove(mainContainer);
                zIndex = 10000;
            }
            insideTranslationRef.value = false;
            const selection = self.getSelection();
            // On Mac, check both altKey and the Option key using getModifierState
            const isAltPressed = evt.altKey || (evt.getModifierState && evt.getModifierState("Alt"));
            if (selection && isAltPressed) {
                zIndex = self.showTranslation(selection, evt, zIndex, insideTranslationRef);
            }
        });

        // Handle double click with Alt key (for Mac compatibility)
        // Note: On Mac, we need to check modifier state differently
        // Also listen on mousedown to catch Alt key state before double-click
        let altKeyDown = false;
        document.addEventListener("keydown", function (e: KeyboardEvent) {
            if (e.key === "Alt" || e.key === "Option" || e.altKey) {
                altKeyDown = true;
            }
        });
        document.addEventListener("keyup", function (e: KeyboardEvent) {
            if (e.key === "Alt" || e.key === "Option" || !e.altKey) {
                altKeyDown = false;
            }
        });
        
        document.addEventListener("dblclick", function (evt: MouseEvent) {
            // On Mac, check both altKey and the Option key using getModifierState
            // Also check our tracked altKeyDown state as fallback
            const isAltPressed = evt.altKey || 
                                (evt.getModifierState && evt.getModifierState("Alt")) ||
                                altKeyDown;
            
            if (isAltPressed) {
                // Prevent default double-click behavior (like text selection)
                evt.preventDefault();
                evt.stopPropagation();
                
                // Get the word at the double-click position
                // First try to get selection (browser may have selected the word)
                let selection = self.getSelection();
                
                // If no selection, try to get word from the click position
                if (!selection || selection.trim() === "") {
                    const range = document.caretRangeFromPoint?.(evt.clientX, evt.clientY) || 
                                  (document as any).caretPositionFromPoint?.(evt.clientX, evt.clientY);
                    if (range) {
                        const textNode = range.startContainer;
                        if (textNode.nodeType === Node.TEXT_NODE) {
                            const text = textNode.textContent || "";
                            const offset = range.startOffset;
                            // Extract word at cursor position - look for word boundaries
                            const beforeText = text.substring(Math.max(0, offset - 100), offset);
                            const afterText = text.substring(offset, Math.min(text.length, offset + 100));
                            const beforeMatch = beforeText.match(/(\w+)$/);
                            const afterMatch = afterText.match(/^(\w+)/);
                            if (beforeMatch || afterMatch) {
                                selection = (beforeMatch ? beforeMatch[1] : "") + (afterMatch ? afterMatch[1] : "");
                            }
                        }
                    }
                }
                
                if (selection && selection.trim() !== "") {
                    const mainContainer = document.querySelector(".lexinExtensionMainContainer") as HTMLElement;
                    if (mainContainer && !insideTranslationRef.value) {
                        DomUtils.remove(mainContainer);
                        zIndex = 10000;
                    }
                    insideTranslationRef.value = false;
                    zIndex = self.showTranslation(selection.trim(), evt, zIndex, insideTranslationRef);
                }
            }
        });
    }

     initialize() {
        this.handleGetSelection();
        this.subscribeOnClicks();
    }
}

export default ContentScript;


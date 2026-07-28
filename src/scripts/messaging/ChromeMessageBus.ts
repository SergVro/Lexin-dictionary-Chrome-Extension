import { IMessageBus, MessageHandler } from "../common/Interfaces.js";
import MessageType from "./MessageType.js";

class ChromeMessageBus implements IMessageBus {

    registerHandler(method: MessageType, handler: MessageHandler, ignoreEmptyResult?: boolean): void {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.method === method) {
                const result = handler(request.args);
                if (result && result.then) {
                    result.then((response) => {
                        sendResponse(response);
                    });
                    return true; // message listener should return true if response is async
                } else if (!(ignoreEmptyResult && !result)) {
                    sendResponse(result);
                }
            }
        });
    }

    sendMessage(method: MessageType, args: any): Promise<any> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ method: method, args: args }, function (response: any) {
                resolve(response);
            });
        });
    }

    sendMessageToActiveTab(method: MessageType, args: any): Promise<any> {
        return new Promise((resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                // No addressable tab, e.g. devtools or another extension window
                // is focused. tabs[0] is undefined here, so guard before reading id.
                const activeTabId = tabs[0]?.id;
                if (activeTabId === undefined) {
                    resolve(undefined);
                    return;
                }
                chrome.tabs.sendMessage(activeTabId, {method: method, args: args}, function (response: any) {
                    // lastError is set whenever no frame answered: a page with
                    // nothing selected, where every frame stays silent by design
                    // (see MessageHandlers.registerGetSelectionHandler), or a page
                    // the content script cannot run on such as chrome:// or the
                    // Web Store. Both are ordinary outcomes, so resolve instead of
                    // leaving the promise pending. Reading lastError also marks it
                    // handled and keeps the console clean.
                    const unanswered = chrome.runtime.lastError !== undefined;
                    resolve(unanswered ? undefined : response);
                });
            });
        });
    }

    createNewTab(url: string): void {
        chrome.tabs.create({"url": url}, function () {});
    }
}

export default ChromeMessageBus;


import { IMessageBus, MessageHandler } from "../Interfaces.js";
import MessageType from "./MessageType.js";
import $ from "jquery";

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

    sendMessage(method: MessageType, args: any): JQueryPromise<any> {
        const deferred = $.Deferred();
        chrome.runtime.sendMessage({ method: method, args: args }, function (response: any) {
            deferred.resolve(response);
        });
        return deferred.promise();

    }

    sendMessageToActiveTab(method: MessageType, args: any): JQueryPromise<any> {
        const deferred = $.Deferred();
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {method: method, args: args}, function (response: any) {
                if (response) {
                    deferred.resolve(response);
                }
            });
        });
        return deferred.promise();
    }

    createNewTab(url: string): void {
        chrome.tabs.create({"url": url}, function () {});
    }
}

export default ChromeMessageBus;


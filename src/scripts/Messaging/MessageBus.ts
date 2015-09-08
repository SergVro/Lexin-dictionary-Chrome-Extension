//# sourceURL=MessageBus.js

import interfaces = require("../Interfaces");
import IMessageBus = interfaces.IMessageBus;

import ChromeMessageBus = require("./ChromeMessageBus");

class MessageBus {
    private static instance: IMessageBus;

    static get Instance(){
        if (!this.instance) {
            if (this.getCurrentBrowser() === "Chrome") {
                this.instance = new ChromeMessageBus();
            }
        }
        return this.instance;
    }

    private static getCurrentBrowser() {
        return "Chrome"; // TODO implement me
    }
}

export = MessageBus;

import { IMessageBus } from "../common/Interfaces.js";
import ChromeMessageBus from "./ChromeMessageBus.js";

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

export default MessageBus;

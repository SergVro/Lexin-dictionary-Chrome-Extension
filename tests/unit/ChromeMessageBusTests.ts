import ChromeMessageBus from "../../src/scripts/messaging/ChromeMessageBus.js";
import MessageType from "../../src/scripts/messaging/MessageType.js";

/**
 * sendMessageToActiveTab used to resolve only when a response arrived, so every
 * "nobody answered" path left the promise pending forever - PopupPage's
 * "No word selected" branch could never run. These tests pin that the promise
 * settles on all of them.
 */
describe("ChromeMessageBus.sendMessageToActiveTab", () => {

    let messageBus: ChromeMessageBus;
    let lastErrorReads: number;

    /**
     * Installs a chrome double whose tabs.sendMessage invokes its callback the
     * way Chrome does: with a response, or with no response and lastError set.
     * lastError reads are counted so we can assert Chrome will not log an
     * "Unchecked runtime.lastError" warning.
     */
    function fakeChrome(options: { tabs: any[], response?: any, lastError?: string }) {
        lastErrorReads = 0;
        const runtime = {
            get lastError() {
                lastErrorReads++;
                return options.lastError ? { message: options.lastError } : undefined;
            }
        };
        (global as any).chrome = {
            runtime,
            tabs: {
                query: (_query: any, callback: (tabs: any[]) => void) => callback(options.tabs),
                sendMessage: (_id: number, _message: any, callback: (response: any) => void) =>
                    callback(options.lastError ? undefined : options.response)
            }
        };
    }

    beforeEach(() => {
        messageBus = new ChromeMessageBus();
    });

    afterEach(() => {
        delete (global as any).chrome;
    });

    it("should resolve with the response when a frame answers", async () => {
        fakeChrome({ tabs: [{ id: 7 }], response: "bil" });

        await expect(messageBus.sendMessageToActiveTab(MessageType.getSelection, undefined))
            .resolves.toBe("bil");
    });

    it("should resolve when no frame answers", async () => {
        // Every frame stays silent when nothing is selected on the page.
        fakeChrome({ tabs: [{ id: 7 }], lastError: "The message port closed before a response was received." });

        await expect(messageBus.sendMessageToActiveTab(MessageType.getSelection, undefined))
            .resolves.toBeUndefined();
    });

    it("should resolve when the tab has no content script", async () => {
        // chrome:// pages and the Web Store, where the content script cannot run.
        fakeChrome({ tabs: [{ id: 7 }], lastError: "Could not establish connection. Receiving end does not exist." });

        await expect(messageBus.sendMessageToActiveTab(MessageType.getSelection, undefined))
            .resolves.toBeUndefined();
    });

    it("should resolve when there is no active tab", async () => {
        // tabs[0] is undefined when devtools or another extension window is focused;
        // reading .id off it used to throw inside the callback and strand the promise.
        fakeChrome({ tabs: [] });

        await expect(messageBus.sendMessageToActiveTab(MessageType.getSelection, undefined))
            .resolves.toBeUndefined();
    });

    it("should read lastError so Chrome does not log an unchecked error", async () => {
        fakeChrome({ tabs: [{ id: 7 }], response: "bil" });

        await messageBus.sendMessageToActiveTab(MessageType.getSelection, undefined);

        expect(lastErrorReads).toBeGreaterThan(0);
    });
});

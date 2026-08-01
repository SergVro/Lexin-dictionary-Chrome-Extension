import BackgroundWorker from "../../src/scripts/worker/BackgroundWorker.js";
import TranslationDirection from "../../src/scripts/dictionary/TranslationDirection.js";
import {
    FakeHistoryManager,
    FakeTranslationManager,
    FakeMessageHandlers
} from "./util/fakes.js";

describe("BackgroundWorker", () => {
    let backgroundWorker: BackgroundWorker;
    let fakeHistoryManager: FakeHistoryManager;
    let fakeTranslationManager: FakeTranslationManager;
    let fakeMessageHandlers: FakeMessageHandlers;

    beforeEach(() => {
        fakeHistoryManager = new FakeHistoryManager();
        fakeTranslationManager = new FakeTranslationManager();
        fakeMessageHandlers = new FakeMessageHandlers();
        backgroundWorker = new BackgroundWorker(fakeHistoryManager, fakeTranslationManager, fakeMessageHandlers);
    });

    describe("getTranslation", () => {
        it("should get word translation", async () => {
            const translation = await backgroundWorker.getTranslation("aword", TranslationDirection.to);
            expect(translation.translation).toBe(fakeTranslationManager.translation);
            expect(translation.error).toBeNull();
        });

        it("should handle translation failure", async () => {
            fakeTranslationManager.reject = {status: 404};
            const translation = await backgroundWorker.getTranslation("aword", TranslationDirection.to);
            expect(translation.error).toBe("Error connecting to the dictionary service: 404");
            expect(translation.translation).toBeNull();
        });
    });

    describe("openActionPopup", () => {
        // The Translation Card's expand button reaches chrome.action through here,
        // because a content script has no chrome.action of its own.
        let originalChrome: any;

        beforeEach(() => {
            originalChrome = (global as any).chrome;
        });

        afterEach(() => {
            (global as any).chrome = originalChrome;
        });

        it("should open the Action Popup", async () => {
            let opened = 0;
            (global as any).chrome = { action: { openPopup: () => { opened++; return Promise.resolve(); } } };

            await backgroundWorker.openActionPopup();

            expect(opened).toBe(1);
        });

        it("should swallow a rejection rather than break the card", async () => {
            // chrome.action.openPopup is Chrome 127+ and rejects when there is no
            // focused window. The card the reader already has open must survive it.
            (global as any).chrome = { action: { openPopup: () => Promise.reject(new Error("no window")) } };

            await expect(backgroundWorker.openActionPopup()).resolves.toBeUndefined();
        });
    });

    it("initialize should register handlers", () => {
        backgroundWorker.initialize();

        expect(fakeMessageHandlers.getTranslationHandler).not.toBeNull();
        expect(fakeMessageHandlers.clearHistoryHandler).not.toBeNull();
        expect(fakeMessageHandlers.loadHistoryHandler).not.toBeNull();
        expect(fakeMessageHandlers.openActionPopupHandler).not.toBeNull();
    });
});

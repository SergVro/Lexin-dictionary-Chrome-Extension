import BackgroundWorker from "../../src/scripts/worker/BackgroundWorker.js";
import { TRANSLATE_SELECTION_COMMAND } from "../../src/scripts/common/LookupTrigger.js";
import TranslationDirection from "../../src/scripts/dictionary/TranslationDirection.js";
import MessageType from "../../src/scripts/messaging/MessageType.js";
import {
    FakeHistoryManager,
    FakeTranslationManager,
    FakeMessageHandlers,
    FakeAudioPlayer,
    FakeMessageBus
} from "./util/fakes.js";

describe("BackgroundWorker", () => {
    let backgroundWorker: BackgroundWorker;
    let fakeHistoryManager: FakeHistoryManager;
    let fakeTranslationManager: FakeTranslationManager;
    let fakeMessageHandlers: FakeMessageHandlers;
    let fakeAudioPlayer: FakeAudioPlayer;
    let fakeMessageBus: FakeMessageBus;

    beforeEach(() => {
        fakeHistoryManager = new FakeHistoryManager();
        fakeTranslationManager = new FakeTranslationManager();
        fakeMessageHandlers = new FakeMessageHandlers();
        fakeAudioPlayer = new FakeAudioPlayer();
        fakeMessageBus = new FakeMessageBus();
        backgroundWorker = new BackgroundWorker(fakeHistoryManager, fakeTranslationManager, fakeMessageHandlers,
            fakeAudioPlayer, fakeMessageBus);
    });

    describe("translateSelection", () => {
        it("should ask the active tab to look up its selection", async () => {
            await backgroundWorker.translateSelection();
            expect(fakeMessageBus.sentToActiveTab).toEqual([MessageType.translateSelection]);
        });

        it("should answer the keyboard shortcut", async () => {
            // Chrome delivers a shortcut to the worker and nowhere else, so this
            // registration is the only route a keystroke has into the extension.
            backgroundWorker.initialize();
            fakeMessageBus.pressCommand(TRANSLATE_SELECTION_COMMAND);

            expect(fakeMessageBus.sentToActiveTab).toEqual([MessageType.translateSelection]);
        });
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
            // Spying keeps the expected warning out of the test runner's output,
            // where it otherwise reads like a genuine failure.
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

            try {
                await expect(backgroundWorker.openActionPopup()).resolves.toBeUndefined();
                expect(warn).toHaveBeenCalled();
            } finally {
                warn.mockRestore();
            }
        });
    });

    describe("playAudio", () => {
        // The clip cannot be played where it was clicked: a Translation Card lives in
        // the host page's document, so its CSP decides whether lexin.nada.kth.se may
        // be loaded at all. See docs/adr/0004-offscreen-audio-playback.md.
        it("should hand the clip to the audio player", async () => {
            await backgroundWorker.playAudio("https://lexin.nada.kth.se/sound/v2/390998_2.mp3");

            expect(fakeAudioPlayer.playedUrls).toEqual(["https://lexin.nada.kth.se/sound/v2/390998_2.mp3"]);
        });

        it("should answer the caller once playback has started", async () => {
            // The Translation Card does not await this - but the message bus does,
            // and a promise that never settles leaves a port open on every click.
            await expect(backgroundWorker.playAudio("https://lexin.nada.kth.se/a.mp3"))
                .resolves.toBeUndefined();
        });
    });

    it("initialize should register handlers", () => {
        backgroundWorker.initialize();

        expect(fakeMessageHandlers.getTranslationHandler).not.toBeNull();
        expect(fakeMessageHandlers.clearHistoryHandler).not.toBeNull();
        expect(fakeMessageHandlers.loadHistoryHandler).not.toBeNull();
        expect(fakeMessageHandlers.loadHistoryDirectionsHandler).not.toBeNull();
        expect(fakeMessageHandlers.removeHistoryItemHandler).not.toBeNull();
        expect(fakeMessageHandlers.openActionPopupHandler).not.toBeNull();
        expect(fakeMessageHandlers.playAudioHandler).not.toBeNull();
    });
});

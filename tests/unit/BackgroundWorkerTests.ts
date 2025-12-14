import BackgroundWorker from "../../src/scripts/BackgroundWorker.js";
import TranslationDirection from "../../src/scripts/Dictionary/TranslationDirection.js";
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

    it("initialize should register handlers", () => {
        backgroundWorker.initialize();

        expect(fakeMessageHandlers.getTranslationHandler).not.toBeNull();
        expect(fakeMessageHandlers.clearHistoryHandler).not.toBeNull();
        expect(fakeMessageHandlers.loadHistoryHandler).not.toBeNull();
    });
});

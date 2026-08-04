import OffscreenAudioPlayer from "../../src/scripts/worker/OffscreenAudioPlayer.js";
import MessageType from "../../src/scripts/messaging/MessageType.js";

const CLIP = "https://lexin.nada.kth.se/sound/v2/390998_2.mp3";
const PAGE = "chrome-extension://lexin/html/offscreen.html";

/**
 * The Offscreen Document is where a pronunciation clip is allowed to load - the
 * Translation Card's own document is the reader's page, whose CSP blocks it. What is
 * worth pinning here is the document's lifetime, because the extension does not own
 * it: Chrome closes an AUDIO_PLAYBACK document 30 seconds after the last sound, so
 * "is there one?" is a question with a different answer on every click.
 *
 * See docs/adr/0004-offscreen-audio-playback.md.
 */
describe("OffscreenAudioPlayer", () => {

    let player: OffscreenAudioPlayer;
    let creates: number;
    let sent: any[];
    let documentExists: boolean;

    /**
     * A chrome double that behaves like the real one on the points that matter:
     * getContexts reports the document only while it exists, createDocument rejects
     * when one already does, and a message sent to a closed document goes unanswered.
     *
     * `answer` decides what an open document does with the clip - `undefined` stands
     * for a document that takes the message and never responds. `closesAfterCheck`
     * plays out the race the retry exists for: the document is there when getContexts
     * is asked and gone by the time the message goes out.
     */
    function fakeChrome(options: {
        exists?: boolean, answer?: (url: string) => any, closesAfterCheck?: boolean
    } = {}) {
        creates = 0;
        sent = [];
        documentExists = options.exists === true;
        let closesAfterCheck = options.closesAfterCheck === true;
        const answer = options.answer ?? (() => true);

        (global as any).chrome = {
            runtime: {
                getURL: (path: string) => `chrome-extension://lexin/${path}`,
                getContexts: (filter: any) => {
                    const found = documentExists && filter.documentUrls[0] === PAGE;
                    if (found && closesAfterCheck) {
                        documentExists = false;
                        closesAfterCheck = false;
                    }
                    return Promise.resolve(found ? [{ contextType: "OFFSCREEN_DOCUMENT" }] : []);
                },
                sendMessage: (message: any, callback: (response: any) => void) => {
                    sent.push(message);
                    callback(documentExists ? answer(message.args.url) : undefined);
                }
            },
            offscreen: {
                Reason: { AUDIO_PLAYBACK: "AUDIO_PLAYBACK" },
                createDocument: () => {
                    if (documentExists) {
                        return Promise.reject(new Error("Only a single offscreen document may be created."));
                    }
                    creates++;
                    documentExists = true;
                    return Promise.resolve();
                }
            }
        };
    }

    beforeEach(() => {
        player = new OffscreenAudioPlayer();
    });

    afterEach(() => {
        delete (global as any).chrome;
    });

    it("should open the document and send it the clip", async () => {
        fakeChrome();

        await player.play(CLIP);

        expect(creates).toBe(1);
        expect(sent).toEqual([{ method: MessageType.playAudioInOffscreenDocument, args: { url: CLIP } }]);
    });

    it("should reuse a document that is already open", async () => {
        fakeChrome({ exists: true });

        await player.play(CLIP);
        await player.play(CLIP);

        expect(creates).toBe(0);
        expect(sent).toHaveLength(2);
    });

    it("should open one document for clips clicked at the same moment", async () => {
        // Chrome allows a single Offscreen Document per extension and rejects the
        // second createDocument, so two clicks must queue behind one creation.
        fakeChrome();

        await Promise.all([player.play(CLIP), player.play(CLIP)]);

        expect(creates).toBe(1);
        expect(sent).toHaveLength(2);
    });

    it("should reopen the document when it has been closed under it", async () => {
        // Chrome closes the document after 30 seconds of silence. getContexts can
        // therefore say "open" and the message still land nowhere - the retry is what
        // keeps that from swallowing the click.
        fakeChrome({ exists: true, closesAfterCheck: true });

        await player.play(CLIP);

        expect(creates).toBe(1);
        expect(sent).toHaveLength(2);
    });

    it("should not retry forever when the document keeps silent", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        fakeChrome({ answer: () => undefined });

        try {
            await player.play(CLIP);

            expect(sent).toHaveLength(2);
            expect(error).toHaveBeenCalled();
        } finally {
            error.mockRestore();
        }
    });

    it("should survive a document it cannot open", async () => {
        // The clip going silent is bad; an unhandled rejection in the service worker,
        // which takes the message port down with it, is worse.
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        fakeChrome();
        (global as any).chrome.offscreen.createDocument = () => Promise.reject(new Error("no document for you"));

        try {
            await expect(player.play(CLIP)).resolves.toBeUndefined();
            expect(sent).toHaveLength(0);
        } finally {
            error.mockRestore();
        }
    });
});

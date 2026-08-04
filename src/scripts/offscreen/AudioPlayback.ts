import { IMessageHandlers } from "../common/Interfaces.js";

/**
 * The Offscreen Document's whole job: hold the <audio> element the service worker
 * cannot, and load clips under the extension's CSP rather than a web page's.
 *
 * Nothing here closes the document. Chrome does it, 30 seconds after the last sound
 * an AUDIO_PLAYBACK document made - which is both the reason the page asks for that
 * reason and why a reader who plays several words in a row pays the creation cost
 * once. See docs/adr/0004-offscreen-audio-playback.md.
 */
class AudioPlayback {

    private messageHandlers: IMessageHandlers;
    private current: HTMLAudioElement | null = null;

    constructor(messageHandlers: IMessageHandlers) {
        this.messageHandlers = messageHandlers;
    }

    /**
     * Resolves true once playback has started - the worker reads that as "the
     * document is alive and took the clip", and asks again if it never arrives.
     */
    async play(url: string): Promise<boolean> {
        // A second LYSSNA click replaces the first clip rather than talking over it.
        if (this.current) {
            this.current.pause();
        }

        const audio = new Audio(url);
        this.current = audio;
        try {
            await audio.play();
        } catch (error) {
            // A clip that will not play is worth a line in the Offscreen Document's
            // console, but the answer still goes back: the document did its part,
            // and a retry would only fail the same way.
            console.error("playAudio: failed to play", url, error);
        }
        return true;
    }

    initialize(): void {
        this.messageHandlers.registerPlayAudioInOffscreenDocumentHandler((url) => this.play(url));
    }
}

export default AudioPlayback;
